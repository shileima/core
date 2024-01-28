import { Ref } from 'react';

import { Injectable } from '@opensumi/di';
import { Event } from '@opensumi/ide-core-common';

export const ProjectService = Symbol('ProjectService');

export interface IProjectInitProps {
  createProject: () => void;
  openProject: () => void;
  onDidProjectEvent: Event<string>;
}

export interface IProjectCreateProps {
  formDatas: IFormDatas;
  ref: Ref<any>;
  updateFormDatas: (IFormDatas) => void;
  resetFormDatas?: () => void;
}

export interface ProjectNode {
  key: string;
  title: string;
  children?: ProjectNode[];
}

export interface OrgTreeNodeProps {
  id: string;
  name: string | React.ReactNode;
  disabled?: boolean;
  children?: OrgTreeNodeProps[];
}

export interface IFormDatas {
  projectId?: string;
  projectName?: string;
  projectDesc?: string;
  type?: number;
  belongType?: string;
  belongOrg?: string;
  belongMis?: string;
  managerOrg?: string[];
  readOrg?: string[];
  managerMis?: string[];
  editOrg?: string[];
  editMis?: string[];
  readMis?: string[];
  operator?: string;
}
