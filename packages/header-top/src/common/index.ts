import { Event } from '@opensumi/ide-core-common';

// export const ITodoConnectionServerPath = 'ITodoConnectionServerPath';

export const IHeaderTopService = Symbol('IHeaderTopService');
export interface IHeaderTopService {
  createProject(): void;
  openProject(): void;
  onDidProjectEvent: Event<string>;
}

export namespace PROJECT_COMMANDS {
  export const CREATE_PROJECT = {
    id: 'project.createProject',
    label: 'Create Project',
  };
  export const OPEN_PROJECT = {
    id: 'project.openProject',
    label: 'Open Project',
  };
}

export const projectSwitchTabs = {
  '1': '常用',
  '2': '团队',
  '3': '个人',
};
