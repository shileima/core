import { Select, Spin } from 'antd';
import type { SelectProps } from 'antd/es/select';
import debounce from 'lodash/debounce';
import React, { useMemo, useRef, useState } from 'react';

import { getMiscListByName } from '../../../api';

export interface DebounceSelectProps<ValueType = any>
  extends Omit<SelectProps<ValueType | ValueType[]>, 'options' | 'children'> {
  fetchOptions: (search: string) => Promise<ValueType[]>;
  debounceTimeout?: number;
}

function DebounceSelect<ValueType extends { key?: string; label: React.ReactNode; value: string | number } = any>({
  fetchOptions,
  debounceTimeout = 800,
  ...props
}: DebounceSelectProps<ValueType>) {
  const [fetching, setFetching] = useState(false);
  const [options, setOptions] = useState<ValueType[]>([]);
  const fetchRef = useRef(0);

  const debounceFetcher = useMemo(() => {
    const loadOptions = (value: string) => {
      fetchRef.current += 1;
      const fetchId = fetchRef.current;
      setOptions([]);
      setFetching(true);

      fetchOptions(value).then((newOptions) => {
        if (fetchId !== fetchRef.current) {
          // for fetch callback order
          return;
        }

        setOptions(newOptions);
        setFetching(false);
      });
    };

    return debounce(loadOptions, debounceTimeout);
  }, [fetchOptions, debounceTimeout]);

  return (
    <Select
      labelInValue
      filterOption={false}
      onSearch={debounceFetcher}
      notFoundContent={fetching ? <Spin size='small' /> : null}
      {...props}
      options={options}
    />
  );
}

// Usage of DebounceSelect
export interface UserValue {
  label: string;
  value: string;
}

export interface MiscListByNameParams {
  name: string;
  orgName: string;
  account: string;
}

async function fetchUserList(name: string): Promise<UserValue[]> {
  let userList = [];
  const params = {
    name,
    allUser: false,
  };
  const getMisRes = await getMiscListByName(params);
  const { code, data } = getMisRes;
  if (code === 0) {
    userList = data.map((item: MiscListByNameParams) => ({
      label: item.name,
      value: item.account,
    }));
  } else {
    console.error('获取用户列表失败');
  }
  return userList;
}

export interface IUserSelectProps {
  value?: UserValue[];
  onChange?: (value: UserValue[]) => void;
}

const UserSelect: React.FC<IUserSelectProps> = (props) => {
  const [value, setValue] = useState<UserValue[]>([]);

  return (
    <DebounceSelect
      mode='multiple'
      value={value}
      placeholder='请选择'
      fetchOptions={fetchUserList}
      maxTagCount='responsive'
      onChange={(newValue) => {
        setValue(newValue as UserValue[]);
        props.onChange && props.onChange(newValue as UserValue[]);
      }}
      style={{ width: '100%' }}
    />
  );
};

export default UserSelect;
