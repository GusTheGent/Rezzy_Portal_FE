import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  HostListener,
} from '@angular/core';
import Konva from 'konva';

interface FloorLevel {
  id: string;
  name: string;
  environment: 'indoors' | 'outdoors';
  nodes: Konva.Group[];
}

@Component({
  selector: 'rezzy-floor-plan',
  templateUrl: './floor-plan.page.html',
  styleUrls: ['./floor-plan.page.scss'],
  standalone: false,
})
export class FloorPlanPage implements AfterViewInit {
  @ViewChild('canvasContainer', { static: false }) canvasContainer: ElementRef;

  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private gridLayer: Konva.Layer;

  public floorLevels: FloorLevel[] = [
    { id: 'level-1', name: 'Ground Floor', environment: 'indoors', nodes: [] },
  ];
  public currentFloorIndex = 0;

  public placedObjects: Konva.Group[] = [];

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

    this.placedObjects = this.floorLevels[this.currentFloorIndex].nodes;

    this.layer.batchDraw();
    this.recalculateAggregateCounts();
  }

  public selectFloorLevel(newIndex: number) {
    if (newIndex === this.currentFloorIndex) return;

    this.deselectAll();

    this.floorLevels[this.currentFloorIndex].nodes = [...this.placedObjects];

    this.placedObjects.forEach((obj) => obj.remove());

    this.currentFloorIndex = newIndex;

    this.placedObjects = this.floorLevels[newIndex].nodes || [];

    this.placedObjects.forEach((obj) => this.layer.add(obj));

    this.drawBackgroundGrid();
    this.layer.batchDraw();
    this.recalculateAggregateCounts();
  }

  public addNewFloorLevelPrompt() {
    const defaultName = `Level ${this.floorLevels.length + 1}`;
    const levelName = prompt('Enter Level/Floor Identity Name:', defaultName);
    if (!levelName) return;

    const newId = `level-${Date.now()}`;
    this.floorLevels.push({
      id: newId,
      name: levelName,
      environment: 'indoors',
      nodes: [],
    });

    this.selectFloorLevel(this.floorLevels.length - 1);
  }

  public removeFloorLevel(index: number, event: Event) {
    event.stopPropagation();

    if (this.floorLevels.length <= 1) {
      alert('Canvas requires a minimum of one floor level.');
      return;
    }

    const targetLevel = this.floorLevels[index];
    if (
      !confirm(
        `Are you sure you want to completely delete "${targetLevel.name}" and all of its placed items?`,
      )
    ) {
      return;
    }

    this.deselectAll();

    if (index === this.currentFloorIndex) {
      this.placedObjects.forEach((obj) => obj.destroy());
      this.placedObjects = [];

      this.floorLevels.splice(index, 1);

      if (this.currentFloorIndex >= this.floorLevels.length) {
        this.currentFloorIndex = this.floorLevels.length - 1;
      }

      this.placedObjects = this.floorLevels[this.currentFloorIndex].nodes || [];
      this.placedObjects.forEach((obj) => this.layer.add(obj));
    } else {
      if (targetLevel.nodes) {
        targetLevel.nodes.forEach((obj) => obj.destroy());
      }

      this.floorLevels.splice(index, 1);

      if (index < this.currentFloorIndex) {
        this.currentFloorIndex--;
      }
    }

    this.drawBackgroundGrid();
    this.layer.batchDraw();
    this.recalculateAggregateCounts();
  }

  public changeCurrentFloorEnvironment(event: any) {
    const environmentSetting = event.detail.value as 'indoors' | 'outdoors';
    this.floorLevels[this.currentFloorIndex].environment = environmentSetting;
    this.drawBackgroundGrid();
  }

  public changeCurrentFloorName(event: any) {
    const updatedName = event.detail.value;
    if (updatedName && updatedName.trim() !== '') {
      this.floorLevels[this.currentFloorIndex].name = updatedName;
    }
  }

  public recalculateAggregateCounts() {
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
      group.position({
        x: Math.round(group.x() / this.GRID_SIZE) * this.GRID_SIZE,
        y: Math.round(group.y() / this.GRID_SIZE) * this.GRID_SIZE,
      });
    });

    group.on('transform', (e) => {
      const snapAngle = 45;
      const currentRotation = group.rotation();
      group.rotation(Math.round(currentRotation / snapAngle) * snapAngle);
      this.layer.batchDraw();
    });

    group.on('transformend', (e) => {
      const groupNode = group;
      const scaleX = groupNode.scaleX();
      const scaleY = groupNode.scaleY();

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

      groupNode.position({
        x: Math.round(groupNode.x() / this.GRID_SIZE) * this.GRID_SIZE,
        y: Math.round(groupNode.y() / this.GRID_SIZE) * this.GRID_SIZE,
      });

      this.layer.batchDraw();
      this.recalculateAggregateCounts();
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

    const currentEnvironment =
      this.floorLevels[this.currentFloorIndex]?.environment || 'indoors';
    const gridStrokeColor =
      currentEnvironment === 'outdoors' ? '#e2ebd5' : '#e2e8f0';

    for (let x = startX; x <= endX; x += this.GRID_SIZE) {
      this.gridLayer.add(
        new Konva.Line({
          points: [x, startY, x, endY],
          stroke: gridStrokeColor,
          strokeWidth: 1 / stageScale,
          listening: false,
        }),
      );
    }

    for (let y = startY; y <= endY; y += this.GRID_SIZE) {
      this.gridLayer.add(
        new Konva.Line({
          points: [startX, y, endX, y],
          stroke: gridStrokeColor,
          strokeWidth: 1 / stageScale,
          listening: false,
        }),
      );
    }

    this.gridLayer.batchDraw();
  }

  private getNextAvailableTableNumber(): number {
    let allNodes: Konva.Group[] = [];
    this.floorLevels.forEach((lvl) => {
      if (lvl.id === this.floorLevels[this.currentFloorIndex].id) {
        allNodes = allNodes.concat(this.placedObjects);
      } else {
        allNodes = allNodes.concat(lvl.nodes);
      }
    });

    const activeNumbers = allNodes
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

    const isOutdoor =
      this.floorLevels[this.currentFloorIndex].environment === 'outdoors';
    const fillHex = isOutdoor ? '#2e7d32' : '#ff8c00';
    const strokeHex = isOutdoor ? '#1b5e20' : '#e07b00';

    const baseShapeConfig = {
      x: 0,
      y: 0,
      fill: fillHex,
      stroke: strokeHex,
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

    const textLabel = new Konva.Label({
      x: spawnX,
      y: spawnY,
      width: 180,
      height: 40,
      draggable: true,
      id: textId,
      name: 'annotation-text-group',
    });

    textLabel.add(
      new Konva.Tag({
        fill: '#f8fafc',
        stroke: '#cbd5e1',
        strokeWidth: 1,
        cornerRadius: 6,
      }),
    );

    const labelItem = new Konva.Text({
      text: 'Double click to edit text',
      fontSize: 15,
      fontFamily: 'sans-serif',
      fontStyle: 'normal',
      fill: '#334155',
      align: 'center',
      verticalAlign: 'middle',
      padding: 10,
      width: 180,
      height: 40,
      name: 'core-text-shape',
    });

    textLabel.add(labelItem);

    this.setupCommonEventHandlers(textLabel);

    textLabel.on('dblclick dbltap', () => {
      this.runInlineTextEditor(labelItem, textLabel);
    });

    this.placedObjects.push(textLabel);
    this.layer.add(textLabel);
    this.selectNode(textLabel);
  }

  public getSavePayload(): any {
    this.floorLevels[this.currentFloorIndex].nodes = [...this.placedObjects];

    let totalGlobalRooms = 0;
    let totalGlobalTables = 0;

    const levelsExportPayload = this.floorLevels.map((floor) => {
      const rooms: any[] = [];
      const flatTables: any[] = [];
      const flatLabels: any[] = [];

      const currentFloorNodes = floor.nodes || [];
      const roomNodes = currentFloorNodes.filter((obj) =>
        (obj.name() || '').includes('architectural-room'),
      );
      const nonRoomNodes = currentFloorNodes.filter(
        (obj) => !(obj.name() || '').includes('architectural-room'),
      );

      totalGlobalRooms += roomNodes.length;

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

      rooms.sort((a, b) => a.width * a.height - b.width * b.height);

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
          totalGlobalTables++;
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
        id: floor.id,
        name: floor.name,
        environment: floor.environment,
        rooms: rooms,
        unassignedTables: flatTables,
        unassignedLabels: flatLabels,
      };
    });

    return {
      totalRooms: totalGlobalRooms,
      totalTables: totalGlobalTables,
      levels: levelsExportPayload,
    };
  }

  public saveFloorPlan() {
    const payload = this.getSavePayload();
    console.log('Structured Multi-Level Output DTO Payload:', payload);
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
    let hasBeenRemoved = false;

    const removeTextarea = () => {
      if (hasBeenRemoved) return;
      hasBeenRemoved = true;

      textNode.text(textarea.value);

      const computedWidth = Math.max(120, textNode.getTextWidth() + 24);
      textNode.width(computedWidth);
      groupNode.width(computedWidth);

      if (textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }

      groupNode.scaleX(1);
      groupNode.scaleY(1);

      this.layer.batchDraw();
      this.selectNode(groupNode);
    };

    textarea.addEventListener('keydown', (e) => {
      e.stopPropagation();
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
