import axios from 'axios';

import { API_HOST } from './host';

const host = process.env.NODE_ENV === 'development' ? API_HOST.TEST_OPEN : API_HOST.TEST;

/**
 * 获取有权限的工程按照归属团队树状信息 (打开工程弹框)
 * @param {*} params
 * @returns
 */
interface getBelongProjectTreeParams {
  dimension?: string;
  projectName?: string;
  operator?: string;
  projectId?: string;
}

export async function getProjectDataByDimension(params: getBelongProjectTreeParams) {
  try {
    const res = await axios({
      method: 'get',
      url: `${host}/v1/workbench/queryProjectDataByDimension`,
      params,
    });
    return res.data;
  } catch (error) {
    console.error('ERROR');
  }
}
