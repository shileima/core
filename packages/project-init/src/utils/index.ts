export const getCookieValue = (name: string): string => {
  // 分割 document.cookie 字符串，获取所有的 cookie 对
  let cookiesArray = document.cookie.split(';');

  // 遍历 cookie 数组，寻找特定的 cookie 字段
  // for (var i = 0; i < cookiesArray.length; i++) {
  //   var cookiePair = cookiesArray[i].split('='); // 分割每个 name=value 对
  //   var cookieName = cookiePair[0].trim(); // 清除 cookie 名称前的空格
  //   if (cookieName === name) {
  //     return cookiePair[1]; // 返回找到的 cookie 值
  //   }
  // }
  //  Expected a `for-of` loop instead of a `for` loop with this simple iteration  @typescript-eslint/prefer-for-of
  for (const cookie of cookiesArray) {
    const cookiePair = cookie.split('=');
    const cookieName = cookiePair[0].trim();
    if (cookieName === name) {
      return cookiePair[1];
    }
  }

  // 如果没有找到特定字段的 cookie，则返回 null
  return 'mashilei';
};
