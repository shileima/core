import { valueType } from 'antd/es/statistic/utils';
import { ReactNode } from 'react';

export interface OriTreeNodeProps {
  title: string;
  value: string;
  disabled?: boolean;
  children?: OriTreeNodeProps[];
}

export interface IOrgSelectProps {
  defaultValue?: valueType | string[] | undefined;
  multiple: boolean;
  name: string;
  allowClear?: boolean;
  disabled?: boolean;
  treeCheckable?: boolean;
  disabledOrgIds?: string[]; // 禁止选择的组织id
  handleOnSelect?: (orgItem: OriTreeNodeProps) => void;
  handleOnChange?: (value: string[], label: ReactNode[]) => void;
}
