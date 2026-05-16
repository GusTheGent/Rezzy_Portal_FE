import { RoutePath } from "src/app/shared/enums/routes.enum";

interface IRouteItem {
  title: string;
  url: string;
  icon: string;
  disabled: boolean;
}

export const routeItems: IRouteItem[] = [
  {
    title: 'Design Your Place',
    url: `/${RoutePath.FLOOR_PLAN}`,
    icon: 'create',
    disabled: false
  },
  {
    title: 'Reservations',
    url: `/`,
    icon: 'list',
    disabled: false
  },
  {
    title: 'Settings',
    url: `/`,
    icon: 'settings',
    disabled: false
  }
];
