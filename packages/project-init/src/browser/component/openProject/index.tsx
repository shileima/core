import { Input, Tree } from 'antd';
import type { DataNode, DirectoryTreeProps } from 'antd/es/tree';
import React, { useMemo, useState } from 'react';

import { ProjectNode } from '../../../common';

import styles from './style.module.less';


const { DirectoryTree } = Tree;
const { Search } = Input;

const App: React.FC<{
  ref: React.Ref<HTMLElement>;
  projectTreeData: ProjectNode[];
  handleProjectNodeClick: (node: ProjectNode) => void;
}> = (props) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  const dataList: { key: React.Key; title: string }[] = [];
  const generateList = (data: DataNode[]) => {
    // for (let i = 0; i < data.length; i++) {
    //   const node = data[i];
    //   const { key, title } = node;
    //   dataList.push({ key, title: title as string });
    //   if (node.children) {
    //     generateList(node.children);
    //   }
    // }
    // Expected a `for-of` loop instead of a `for` loop with this simple iteration  @typescript-eslint/prefer-for-of
    for (const node of data) {
      const { key, title } = node;
      dataList.push({ key, title: title as string });
      if (node.children) {
        generateList(node.children);
      }
    }
  };
  generateList(props.projectTreeData);

  const getParentKey = (key: React.Key, tree: DataNode[]): React.Key => {
    let parentKey: React.Key;
    // for (let i = 0; i < tree.length; i++) {
    //   const node = tree[i];
    //   if (node.children) {
    //     if (node.children.some((item) => item.key === key)) {
    //       parentKey = node.key;
    //     } else if (getParentKey(key, node.children)) {
    //       parentKey = getParentKey(key, node.children);
    //     }
    //   }
    // }
    // Expected a `for-of` loop instead of a `for` loop with this simple iteration  @typescript-eslint/prefer-for-of
    for (const node of tree) {
      if (node.children) {
        if (node.children.some((item) => item.key === key)) {
          parentKey = node.key;
        } else if (getParentKey(key, node.children)) {
          parentKey = getParentKey(key, node.children);
        }
      }
    }
    return parentKey!;
  };

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
    setAutoExpandParent(false);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const newExpandedKeys = dataList
      .map((item) => {
        if (item.title.indexOf(value) > -1) {
          return getParentKey(item.key, props.projectTreeData);
        }
        return null;
      })
      .filter((item, i, self): item is React.Key => !!(item && self.indexOf(item) === i));
    setExpandedKeys(newExpandedKeys);
    setSearchValue(value);
    setAutoExpandParent(true);
  };

  const handleTreeNodeClick = (selectedKeys: React.Key[], info: any) => {
    props.handleProjectNodeClick(info.node);
  };

  const treeData = useMemo(() => {
    const loop = (data: DataNode[]): DataNode[] =>
      data.map((item) => {
        const strTitle = item.title as string;
        const index = strTitle.indexOf(searchValue);
        const beforeStr = strTitle.substring(0, index);
        const afterStr = strTitle.slice(index + searchValue.length);
        const title =
          index > -1 ? (
            <span>
              {beforeStr}
              <span className={styles.tree_search_value}>{searchValue}</span>
              {afterStr}
            </span>
          ) : (
            <span>{strTitle}</span>
          );
        if (item.children) {
          return { title, key: item.key, children: loop(item.children) };
        }

        return {
          title,
          key: item.key,
        };
      });

    return loop(props.projectTreeData);
  }, [searchValue]);

  return (
    <div>
      <Search style={{ marginBottom: 8 }} placeholder='Search' onChange={onChange} />
      <DirectoryTree
        treeData={treeData}
        expandedKeys={expandedKeys}
        onExpand={onExpand}
        autoExpandParent={autoExpandParent}
        showIcon
        showLine
        onSelect={handleTreeNodeClick}
      />
    </div>
  );
};

export default App;
