import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  HostListener,
} from '@angular/core';
import Konva from 'konva';

@Component({
  selector: 'rezzy-floor-plan',
  templateUrl: './floor-plan.page.html',
  styleUrls: ['./floor-plan.page.scss'],
  standalone: false,
})
export class FloorPlanPage implements AfterViewInit {
  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef;

  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private gridLayer: Konva.Layer;

  private placedObjects: Konva.Group[] = [];
  private roomCounter = 1;
  private readonly GRID_SIZE = 30;

  private transformer: Konva.Transformer;
  public selectedNode: any = null;

  public totalRoomsCount = 0;
  public totalTablesCount = 0;

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      this.deleteSelectedTable();
    }
  }

  ngAfterViewInit() {
    this.initFloorPlanCanvas();
  }

  private initFloorPlanCanvas() {
    const canvasWidth = 1050;
    const canvasHeight = 720;

    this.stage = new Konva.Stage({
      container: this.canvasContainer.nativeElement,
      width: canvasWidth,
      height: canvasHeight,
      draggable: true,
    });

    this.gridLayer = new Konva.Layer();
    this.layer = new Konva.Layer();
    this.stage.add(this.gridLayer);
    this.stage.add(this.layer);

    this.drawBackgroundGrid();

    this.transformer = new Konva.Transformer({
      rotateEnabled: true,
      rotateAnchorOffset: 30,
      rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
      enabledAnchors: [
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
        'top-center',
        'bottom-center',
        'middle-left',
        'middle-right',
      ],
      keepRatio: false,
      borderStroke: '#0055ff',
      borderStrokeWidth: 2,
    });
    this.layer.add(this.transformer);

    this.stage.on('mousedown tap', (e) => {
      if (e.target === this.stage) {
        this.deselectAll();
      }
    });

    this.stage.on('dragmove', () => {
      this.drawBackgroundGrid();
    });

    const scaleBy = 1.1;
    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();
      const oldScale = this.stage.scaleX();
      const pointer = this.stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - this.stage.x()) / oldScale,
        y: (pointer.y - this.stage.y()) / oldScale,
      };

      let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      if (newScale < 0.2) newScale = 0.2;
      if (newScale > 5.0) newScale = 5.0;

      this.stage.scale({ x: newScale, y: newScale });
      this.stage.position({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });

      this.drawBackgroundGrid();
      this.layer.batchDraw();
    });

    this.layer.batchDraw();
    this.recalculateAggregateCounts();
  }

  private recalculateAggregateCounts() {
    this.totalRoomsCount = this.placedObjects.filter((obj) =>
      (obj.name() || '').includes('architectural-room'),
    ).length;

    this.totalTablesCount = this.placedObjects.filter((obj) =>
      (obj.name() || '').includes('furniture-table'),
    ).length;
  }

  public spawnStructuralRoom() {
    const roomId = `Room-${this.roomCounter++}`;
    const initialWidth = 180;
    const initialHeight = 150;

    const spawnX = 150 + ((this.placedObjects.length * 30) % 120);
    const spawnY = 150 + ((this.placedObjects.length * 30) % 120);

    const roomGroup = new Konva.Group({
      x: spawnX,
      y: spawnY,
      width: initialWidth,
      height: initialHeight,
      draggable: true,
      id: roomId,
      name: 'architectural-room',
    });

    const walls = new Konva.Line({
      points: [
        0,
        0,
        initialWidth,
        0,
        initialWidth,
        initialHeight,
        0,
        initialHeight,
        0,
        0,
      ],
      stroke: '#1e293b',
      strokeWidth: 8,
      lineJoin: 'miter',
      lineCap: 'square',
      name: 'room-wall-segments',
    });

    roomGroup.add(walls);
    this.setupCommonEventHandlers(roomGroup);

    this.placedObjects.push(roomGroup);
    this.layer.add(roomGroup);
    this.selectNode(roomGroup);

    this.recalculateAggregateCounts();
  }

  private setupCommonEventHandlers(group: Konva.Group) {
    group.on('mouseover', () => {
      document.body.style.cursor = 'move';
    });
    group.on('mouseout', () => {
      document.body.style.cursor = 'default';
    });

    group.on('dragmove', (e) => {
      const node = e.target as Konva.Group;
      const absPos = node.getAbsolutePosition();
      node.setAbsolutePosition({
        x: Math.round(absPos.x / this.GRID_SIZE) * this.GRID_SIZE,
        y: Math.round(absPos.y / this.GRID_SIZE) * this.GRID_SIZE,
      });
    });

    group.on('transform', (e) => {
      const groupNode = e.target as Konva.Group;
      const scaleX = groupNode.scaleX();
      const scaleY = groupNode.scaleY();

      const snapAngle = 45;
      const currentRotation = groupNode.rotation();
      groupNode.rotation(Math.round(currentRotation / snapAngle) * snapAngle);

      if (groupNode.name() === 'architectural-room') {
        const wallLine = groupNode.findOne('.room-wall-segments') as Konva.Line;
        if (wallLine) {
          const newW =
            Math.round((groupNode.width() * scaleX) / this.GRID_SIZE) *
            this.GRID_SIZE;
          const newH =
            Math.round((groupNode.height() * scaleY) / this.GRID_SIZE) *
            this.GRID_SIZE;

          groupNode.width(newW);
          groupNode.height(newH);
          wallLine.points([0, 0, newW, 0, newW, newH, 0, newH, 0, 0]);
        }
      } else if (groupNode.name() === 'annotation-text-group') {
        const textShape = groupNode.findOne('.core-text-shape') as Konva.Text;
        if (textShape) {
          const newWidth = groupNode.width() * scaleX;
          const newHeight = groupNode.height() * scaleY;

          groupNode.width(newWidth);
          groupNode.height(newHeight);
          textShape.width(newWidth);
          textShape.height(newHeight);
        }
      } else {
        const mainShape = groupNode.findOne('.main-shape');
        const textLabel = groupNode.findOne('.text-label');

        if (mainShape) {
          if (mainShape instanceof Konva.Circle) {
            mainShape.radius(mainShape.radius() * ((scaleX + scaleY) / 2));
          } else if (mainShape instanceof Konva.Rect) {
            const newW = mainShape.width() * scaleX;
            const newH = mainShape.height() * scaleY;
            mainShape.width(newW);
            mainShape.height(newH);
            mainShape.offsetX(newW / 2);
            mainShape.offsetY(newH / 2);
          } else if (mainShape instanceof Konva.Ellipse) {
            mainShape.radiusX(mainShape.radiusX() * scaleX);
            mainShape.radiusY(mainShape.radiusY() * scaleY);
          }
        }
        if (textLabel) {
          const text = textLabel as Konva.Text;
          text.width(text.width() * scaleX);
          text.height(text.height() * scaleY);
          text.offsetX(text.width() / 2);
          text.offsetY(text.height() / 2);
        }
      }

      groupNode.scaleX(1);
      groupNode.scaleY(1);
      this.layer.batchDraw();
    });

    group.on('click tap', (e) => {
      e.cancelBubble = true;
      this.selectNode(group);
    });
  }

  private selectNode(node: any) {
    this.selectedNode = node;
    this.transformer.nodes([node]);
    this.layer.batchDraw();
  }

  private deselectAll() {
    this.selectedNode = null;
    this.transformer.nodes([]);
    this.layer.batchDraw();
  }

  public deleteSelectedTable() {
    if (!this.selectedNode) return;
    const idToRemove = this.selectedNode.id();
    this.selectedNode.destroy();
    this.placedObjects = this.placedObjects.filter(
      (obj) => obj.id() !== idToRemove,
    );
    this.deselectAll();
    this.recalculateAggregateCounts();
  }

  public clearWholeCanvas() {
    this.deselectAll();
    this.placedObjects.forEach((obj) => obj.destroy());
    this.placedObjects = [];
    this.roomCounter = 1;
    this.layer.batchDraw();
    this.recalculateAggregateCounts();
  }

  private drawBackgroundGrid() {
    this.gridLayer.destroyChildren();

    const stageScale = this.stage.scaleX();
    const stageX = this.stage.x();
    const stageY = this.stage.y();

    const viewWidth = this.stage.width();
    const viewHeight = this.stage.height();

    const startX =
      Math.floor(-stageX / stageScale / this.GRID_SIZE) * this.GRID_SIZE -
      this.GRID_SIZE;
    const endX = startX + viewWidth / stageScale + this.GRID_SIZE * 2;

    const startY =
      Math.floor(-stageY / stageScale / this.GRID_SIZE) * this.GRID_SIZE -
      this.GRID_SIZE;
    const endY = startY + viewHeight / stageScale + this.GRID_SIZE * 2;

    for (let x = startX; x <= endX; x += this.GRID_SIZE) {
      this.gridLayer.add(
        new Konva.Line({
          points: [x, startY, x, endY],
          stroke: '#e2e8f0',
          strokeWidth: 1 / stageScale,
          listening: false,
        }),
      );
    }

    for (let y = startY; y <= endY; y += this.GRID_SIZE) {
      this.gridLayer.add(
        new Konva.Line({
          points: [startX, y, endX, y],
          stroke: '#e2e8f0',
          strokeWidth: 1 / stageScale,
          listening: false,
        }),
      );
    }

    this.gridLayer.batchDraw();
  }

  private getNextAvailableTableNumber(): number {
    const activeNumbers = this.placedObjects
      .filter((obj) => obj.id().startsWith('T-'))
      .map((obj) => parseInt(obj.id().split('-')[1], 10));
    let candidate = 1;
    while (activeNumbers.includes(candidate)) candidate++;
    return candidate;
  }

  public addDiningTable(
    shapeType: 'circle' | 'rectangle' | 'oval' | 'long-rectangle',
  ) {
    const nextNum = this.getNextAvailableTableNumber();
    const tableId = `T-${nextNum}`;
    const spawnX = 120 + ((this.placedObjects.length * 30) % 180);
    const spawnY = 120 + ((this.placedObjects.length * 30) % 120);

    const tableGroup = new Konva.Group({
      x: spawnX,
      y: spawnY,
      draggable: true,
      id: tableId,
      name: `furniture-table ${shapeType}`,
    });
    let backgroundShape: Konva.Shape;
    let textWidth = 60;
    let textHeight = 60;

    const baseShapeConfig = {
      x: 0,
      y: 0,
      fill: '#ff8c00',
      stroke: '#e07b00',
      strokeWidth: 3,
      name: 'main-shape',
    };

    if (shapeType === 'circle') {
      backgroundShape = new Konva.Circle({ ...baseShapeConfig, radius: 30 });
    } else if (shapeType === 'rectangle') {
      backgroundShape = new Konva.Rect({
        ...baseShapeConfig,
        width: 60,
        height: 60,
        offsetX: 30,
        offsetY: 30,
      });
    } else if (shapeType === 'oval') {
      backgroundShape = new Konva.Ellipse({
        ...baseShapeConfig,
        radiusX: 45,
        radiusY: 30,
      });
      textWidth = 90;
    } else {
      backgroundShape = new Konva.Rect({
        ...baseShapeConfig,
        width: 120,
        height: 60,
        offsetX: 60,
        offsetY: 30,
      });
      textWidth = 120;
    }

    const textLabel = new Konva.Text({
      text: tableId,
      fontSize: 14,
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      fill: '#ffffff',
      align: 'center',
      verticalAlign: 'middle',
      width: textWidth,
      height: textHeight,
      offsetX: textWidth / 2,
      offsetY: textHeight / 2,
      name: 'text-label',
    });

    tableGroup.add(backgroundShape);
    tableGroup.add(textLabel);
    this.setupCommonEventHandlers(tableGroup);

    this.placedObjects.push(tableGroup);
    this.layer.add(tableGroup);
    this.selectNode(tableGroup);

    this.recalculateAggregateCounts();
  }

  public spawnTextLabel() {
    const textId = `Text-${this.placedObjects.length + 1}`;
    const spawnX = 200 + ((this.placedObjects.length * 30) % 120);
    const spawnY = 200 + ((this.placedObjects.length * 30) % 120);

    const textGroup = new Konva.Group({
      x: spawnX,
      y: spawnY,
      width: 180,
      height: 40,
      draggable: true,
      id: textId,
      name: 'annotation-text-group',
    });

    const labelItem = new Konva.Text({
      text: 'Double click to edit text',
      fontSize: 16,
      fontFamily: 'sans-serif',
      fontStyle: 'normal',
      fill: '#334155',
      align: 'center',
      verticalAlign: 'middle',
      padding: 8,
      width: 180,
      height: 40,
      name: 'core-text-shape',
    });

    textGroup.add(labelItem);
    this.setupCommonEventHandlers(textGroup);

    textGroup.on('dblclick dbltap', () => {
      this.runInlineTextEditor(labelItem, textGroup);
    });

    this.placedObjects.push(textGroup);
    this.layer.add(textGroup);
    this.selectNode(textGroup);
  }

  public getSavePayload(): any {
    const rooms: any[] = [];
    const flatTables: any[] = [];
    const flatLabels: any[] = [];

    const roomNodes = this.placedObjects.filter((obj) =>
      (obj.name() || '').includes('architectural-room'),
    );
    const nonRoomNodes = this.placedObjects.filter(
      (obj) => !(obj.name() || '').includes('architectural-room'),
    );

    roomNodes.forEach((room) => {
      const wallLine = room.findOne('.room-wall-segments') as Konva.Line;
      rooms.push({
        id: room.id(),
        type: 'architectural-room',
        x: room.x(),
        y: room.y(),
        width: room.width(),
        height: room.height(),
        rotation: room.rotation(),
        points: wallLine ? wallLine.points() : [],
        tables: [],
      });
    });

    rooms.sort((a, b) => {
      const areaA = a.width * a.height;
      const areaB = b.width * b.height;
      return areaA - areaB;
    });

    const isPointInRoom = (
      tx: number,
      ty: number,
      rx: number,
      ry: number,
      rw: number,
      rh: number,
    ) => {
      return tx >= rx && tx <= rx + rw && ty >= ry && ty <= ry + rh;
    };

    nonRoomNodes.forEach((obj) => {
      const fullName = obj.name() || '';
      const baseData = {
        id: obj.id(),
        x: obj.x(),
        y: obj.y(),
        rotation: obj.rotation(),
      };

      if (fullName.includes('furniture-table')) {
        const shapeType = fullName.split(' ')[1] || 'rectangle';
        const mainShape = obj.findOne('.main-shape');
        const textLabel = obj.findOne('.text-label') as Konva.Text;

        let calculatedWidth = obj.width();
        let calculatedHeight = obj.height();

        if (mainShape) {
          if (mainShape instanceof Konva.Circle) {
            calculatedWidth = mainShape.radius() * 2;
            calculatedHeight = mainShape.radius() * 2;
          } else if (mainShape instanceof Konva.Ellipse) {
            calculatedWidth = mainShape.radiusX() * 2;
            calculatedHeight = mainShape.radiusY() * 2;
          } else {
            calculatedWidth = mainShape.width();
            calculatedHeight = mainShape.height();
          }
        }

        const tablePayload = {
          ...baseData,
          type: 'furniture-table',
          shape: shapeType,
          width: calculatedWidth,
          height: calculatedHeight,
          tableName: textLabel ? textLabel.text() : '',
        };

        let assignedToRoom = false;
        for (const room of rooms) {
          if (
            isPointInRoom(
              tablePayload.x,
              tablePayload.y,
              room.x,
              room.y,
              room.width,
              room.height,
            )
          ) {
            room.tables.push(tablePayload);
            assignedToRoom = true;
            break;
          }
        }

        if (!assignedToRoom) {
          flatTables.push(tablePayload);
        }
      }

      if (fullName.includes('annotation-text-group')) {
        const textShape = obj.findOne('.core-text-shape') as Konva.Text;
        flatLabels.push({
          ...baseData,
          type: 'annotation-text-group',
          width: obj.width(),
          height: obj.height(),
          text: textShape ? textShape.text() : '',
        });
      }
    });

    return {
      totalRooms: this.totalRoomsCount,
      totalTables: this.totalTablesCount,
      rooms: rooms,
      unassignedTables: flatTables,
      unassignedLabels: flatLabels,
    };
  }

  public saveFloorPlan() {
    const payload = this.getSavePayload();
    console.log(payload);
  }

  // public loadFloorPlanFromData(savedData: any) {
  //   this.clearWholeCanvas();

  //   if (savedData.rooms) {
  //     savedData.rooms.forEach((roomData: any) => {
  //       const roomGroup = new Konva.Group({
  //         x: roomData.x,
  //         y: roomData.y,
  //         width: roomData.width,
  //         height: roomData.height,
  //         rotation: roomData.rotation,
  //         id: roomData.id,
  //         name: 'architectural-room',
  //         draggable: true
  //       });

  //       const walls = new Konva.Line({
  //         points: roomData.points,
  //         stroke: '#1e293b',
  //         strokeWidth: 8,
  //         lineJoin: 'miter',
  //         lineCap: 'square',
  //         name: 'room-wall-segments',
  //       });

  //       roomGroup.add(walls);
  //       this.setupCommonEventHandlers(roomGroup);
  //       this.placedObjects.push(roomGroup);
  //       this.layer.add(roomGroup);

  //       const roomNum = parseInt(roomData.id.split('-')[1], 10);
  //       if (roomNum >= this.roomCounter) {
  //         this.roomCounter = roomNum + 1;
  //       }

  //       if (roomData.tables) {
  //         roomData.tables.forEach((tableData: any) => {
  //           this.reconstructTableObject(tableData);
  //         });
  //       }
  //     });
  //   }

  //   if (savedData.unassignedTables) {
  //     savedData.unassignedTables.forEach((tableData: any) => {
  //       this.reconstructTableObject(tableData);
  //     });
  //   }

  //   this.layer.batchDraw();
  //   this.recalculateAggregateCounts();
  // }

  private reconstructTableObject(tableData: any) {
    const tableGroup = new Konva.Group({
      x: tableData.x,
      y: tableData.y,
      rotation: tableData.rotation,
      draggable: true,
      id: tableData.id,
      name: `furniture-table ${tableData.shape}`,
    });

    const baseShapeConfig = {
      x: 0,
      y: 0,
      fill: '#ff8c00',
      stroke: '#e07b00',
      strokeWidth: 3,
      name: 'main-shape',
    };

    let backgroundShape: Konva.Shape;
    if (tableData.shape === 'circle') {
      backgroundShape = new Konva.Circle({
        ...baseShapeConfig,
        radius: tableData.width / 2,
      });
    } else if (tableData.shape === 'rectangle') {
      backgroundShape = new Konva.Rect({
        ...baseShapeConfig,
        width: tableData.width,
        height: tableData.height,
        offsetX: tableData.width / 2,
        offsetY: tableData.height / 2,
      });
    } else if (tableData.shape === 'oval') {
      backgroundShape = new Konva.Ellipse({
        ...baseShapeConfig,
        radiusX: tableData.width / 2,
        radiusY: tableData.height / 2,
      });
    } else {
      backgroundShape = new Konva.Rect({
        ...baseShapeConfig,
        width: tableData.width,
        height: tableData.height,
        offsetX: tableData.width / 2,
        offsetY: tableData.height / 2,
      });
    }

    const textLabel = new Konva.Text({
      text: tableData.tableName,
      fontSize: 14,
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      fill: '#ffffff',
      align: 'center',
      verticalAlign: 'middle',
      width: tableData.width,
      height: tableData.height,
      offsetX: tableData.width / 2,
      offsetY: tableData.height / 2,
      name: 'text-label',
    });

    tableGroup.add(backgroundShape);
    tableGroup.add(textLabel);
    this.setupCommonEventHandlers(tableGroup);

    this.placedObjects.push(tableGroup);
    this.layer.add(tableGroup);
  }

  private runInlineTextEditor(textNode: Konva.Text, groupNode: Konva.Group) {
    this.transformer.nodes([]);
    this.layer.batchDraw();

    const stageBox = this.stage.container().getBoundingClientRect();
    const areaPosition = textNode.getAbsolutePosition();

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    textarea.value = textNode.text();
    textarea.style.position = 'absolute';
    textarea.style.top = `${stageBox.top + window.scrollY + areaPosition.y}px`;
    textarea.style.left = `${stageBox.left + window.scrollX + areaPosition.x}px`;
    textarea.style.width = `${textNode.width() * this.stage.scaleX()}px`;
    textarea.style.height = `${textNode.height() * this.stage.scaleY()}px`;
    textarea.style.fontSize = `${textNode.fontSize() * this.stage.scaleX()}px`;
    textarea.style.border = '2px solid #0055ff';
    textarea.style.padding = '4px';
    textarea.style.margin = '0px';
    textarea.style.overflow = 'hidden';
    textarea.style.background = '#ffffff';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.zIndex = '2000';
    textarea.style.fontFamily = 'sans-serif';

    textarea.focus();

    const removeTextarea = () => {
      textNode.text(textarea.value);
      textNode.width(
        Math.max(100, textNode.measureSize(textarea.value).width + 20),
      );
      textarea.parentNode?.removeChild(textarea);

      groupNode.scaleX(1);
      groupNode.scaleY(1);

      this.layer.batchDraw();
      this.selectNode(groupNode);
    };

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        removeTextarea();
      }
    });

    textarea.addEventListener('blur', () => {
      removeTextarea();
    });
  }
}
