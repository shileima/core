import { TreeSelect } from 'antd';
import React, { useState, useEffect, ReactNode } from 'react';

import { getOrgTreeByOrgId } from '../../../api';
import { OrgTreeNodeProps } from '../../../common';
import { DAOJIA_DEV_ORG_ID } from '../../../config';

import { IOrgSelectProps, OriTreeNodeProps } from './types';

const { SHOW_CHILD } = TreeSelect;

const OrgSelect: React.FC<IOrgSelectProps> = (props) => {
  // const [value, setValue] = useState<string[]>();
  const [treeData, setTreeData] = useState<OriTreeNodeProps[]>([]); // 组织树数据

  const handleOnChange = (value: string[], label: ReactNode[], type: string) => {
    // setValue(value);
    props.handleOnChange && props.handleOnChange(value, label);
  };

  const findNode = (data: OrgTreeNodeProps[], id: string) => {
    let result: OrgTreeNodeProps | undefined;
    if (!Array.isArray(data)) {return result;}
    // debugger
    (data || []).forEach((item) => {
      if (item.id === id) {
        result = item;
      } else if (item.children) {
        const findChildren = findNode(item.children, id);
        if (findChildren) {
          result = findChildren;
        }
      }
    });
    return result;
  };

  const fetchTreeData = async (orgId: string) => {
    const res = await getOrgTreeByOrgId({
      orgId,
    });
    const { code, data } = res;
    if (code !== 0) {
      return;
    } else {
      if (props.disabledOrgIds && props.disabledOrgIds.length > 0) {
        props.disabledOrgIds.forEach((id: string) => {
          const node = findNode([data], id);
          if (node) {node.disabled = true;}
        });
      }
      setTreeData([data]);
    }
  };

  useEffect(() => {
    fetchTreeData(DAOJIA_DEV_ORG_ID);
  }, [props.disabledOrgIds]);

  return (
    <TreeSelect
      showSearch
      style={{ width: '100%', minWidth: '300px' }}
      value={props.multiple ? props.defaultValue : props.defaultValue && props.defaultValue[0]}
      dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
      placeholder='请选择'
      fieldNames={{ label: 'name', value: 'id', children: 'children' }}
      treeDefaultExpandAll
      treeCheckable={props.treeCheckable || false}
      showCheckedStrategy={props.treeCheckable ? SHOW_CHILD : undefined}
      onChange={(value: string[], labelList: ReactNode[]) => handleOnChange(value, labelList, props.name)}
      treeData={treeData}
      maxTagCount='responsive'
      multiple={props.multiple || false}
      allowClear={props.allowClear || false}
      disabled={props.disabled || false}
    />
  );
};

export default OrgSelect;
