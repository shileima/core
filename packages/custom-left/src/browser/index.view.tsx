import { Button, ConfigProvider } from 'antd';
import * as React from 'react';

import * as styles from './components.module.less';
// import { useState, useEffect, useRef } from 'react';

// const ref = useRef<any>(null);
export const CustromRightView = React.memo((props: { name: string }) => (
    <div className={styles.components_wrap}>
      <ConfigProvider prefixCls='sumi_antd'>
        <div style={{ padding: 10 }}>
          <Button>456</Button>
        </div>
      </ConfigProvider>
    </div>
  ));
