## 概述

DJI Pilot 2内嵌的Webview中的H5页面需要开发者自定义设计开发，然后页面的数据和信息是通过JSBridge与DJI Pilot 2进行通信，具体可以通信的JSBridge接口如下：


| JS接口                                                                                            | 接口功能              | 参数说明                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `window.djiBridge.platformSetWorkspaceId(String uuid)`                                            | 设置工作空间ID        | uuid: 工作空间的标识，该id必须为uuid格式。<br/>示例：e3dea0f5-37f2-4d79-ae58-490af3228069<br/>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `window.djiBridge.platformSetInformation(String platformName, String workspaceName, String desc)` | 设置平台名称          | platformName: 平台名称<br/>workspaceName: DJI Pilot 2上云入口显示工作空间名称<br/>desc: DJI Pilot 2上云入口显示工作空间描述                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `window.djiBridge.platformGetRemoteControllerSN() : String`                                       | 获取遥控器SN          | 返回：遥控器SN                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `window.djiBridge.platformGetAircraftSN() : String`                                               | 获取飞机SN            | 返回：飞机SN                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `window.djiBridge.platformStopSelf()`                                                             | 关闭并退出平台        | 退出webview平台                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `window.djiBridge.apiSetToken(String token)`                                                      | 设置Token             | 注意：需要加载API模块后才能获取到                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `window.djiBridge.apiGetToken()`                                                                  | 获取Token             | 从DJI Pilot 2获取api Token                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `window.djiBridge.onBackClick()`                                                                  | 返回键回调            | 在webview页面时，点击页面左上角的返回键时，会触发该接口回调，如果返回值是true，则DJI Pilot 2不处理，如果是false或者没有实现该函数，则DJI Pilot 2会退出webview页面，效果会跟遥控器实体返回按键一致。注意：遥控器返回键无法触发该回调。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `window.djiBridge.onStopPlatform()`                                                               | 退出云平台回调        | App点击退出云平台之前，会调用该js方法，js方法执行结束之后，APP才会继续执行退出平台的动作                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `window.djiBridge.platformSetLogEncryptKey(String key)`                                           | 设置日志加密key       | 设置DJI Pilot 2保存的log日志的公钥                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `window.djiBridge.platformClearLogEncryptKey()`                                                   | 清除日志加密key       | 清除DJI Pilot 2保存的log日志公钥                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `window.djiBridge.platformGetLogPath()`                                                           | 获取日志路径          | 获取DJI Pilot 2保存的日志路径                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `window.open('scheme://host...', arg);`                                                           | 跳转到第三方App       | 采用Scheme格式                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `window.djiBridge.platformGetVersion()`                                                           | 获取版本号            | 返回：<br/>modelVersion:物模型版本<br/>appVersion:APP版本                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `window.djiBridge.platformIsVerified()`                                                           | 查看接口是否被认证    | 查看证书是否已经被认证，发起js通信之前，如果没有认证情况下，会出现通信失败。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `window.djiBridge.platformVerifyLicense(String appId,String appKey,String license)`               | License认证           | appId: 开发者网站上申请的上云API appId<br/>appKey: 开发者网站上申请的上云API appKey<br/>license:开发者网站上申请的上云API license<br/>特别注意：需要先通过认证，JSBridge相关的接口才能被调用                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `window.djiBridge.platformLoadComponent(String name, String param)`                               | 加载功能模块          | name: 功能模块<br/>param: 参数，为json字符<br/>详细的功能模块有：<br/>[设备上云模块](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#%E8%AE%BE%E5%A4%87%E4%B8%8A%E4%BA%91%E6%A8%A1%E5%9D%97)<br/>[直播模块](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#%E7%9B%B4%E6%92%AD%E6%A8%A1%E5%9D%97)<br/>[API模块](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#API%E6%A8%A1%E5%9D%97)<br/>[WS模块](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#WS%E6%A8%A1%E5%9D%97)<br/>[地图元素模块](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#%E5%9C%B0%E5%9B%BE%E5%85%83%E7%B4%A0%E6%A8%A1%E5%9D%97)<br/>[态势感知模块](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#TSA%E6%80%81%E5%8A%BF%E6%84%9F%E7%9F%A5%E6%A8%A1%E5%9D%97)<br/>[媒体模块](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#Media%E5%AA%92%E4%BD%93%E6%A8%A1%E5%9D%97)<br/>[航线模块](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#%E8%88%AA%E7%BA%BF%E6%A8%A1%E5%9D%97)<br/>[MOP模块](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#MOP%E6%A8%A1%E5%9D%97) |
| `window.djiBridge.platformUnloadComponent(String name)`                                           | 去除功能模块          | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `window.djiBridge.platformIsComponentLoaded(String name)`                                         | 判断模块是否加载      | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `window.djiBridge.platformIsAppInstalled(String pkgName)`                                         | 检查是否安装了某APP载 | pkgName: App包名                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `window.djiBridge.startMopCloud()`                                                                | 开启MOP数据传输       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `window.djiBridge.stopMopCloud()`                                                                 | 停止MOP数据传输       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

**返回结构体**

所有的JSBridge用于设置的接口都有返回结构体，结构体模板如下：

```json
//特别注意：JSBridge接口返回值是string类型，需要通过JSON.parse(res)方法进行转换。
{  
    code: 0, //0: 执行成功, 非0: 执行异常
    message: error message, //异常情况说明
    data: {                 //正常情况时的数据，类型T: boolean, String, Int, Object
    }
}
```

## [#](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#%E8%AE%BE%E5%A4%87%E4%B8%8A%E4%BA%91%E6%A8%A1%E5%9D%97)设备上云模块

* name: thing
* param:

```json
{
    host: url, //mqtt地址，示例：  tcp://xx.xx.xx.xx:xxx
    connectCallback: js_callback, //连接状态回调js接口
    username:xxxxx,
    password:xxxx
}
```

*注意*：由于mqtt连接有基于tcp或者websocket的区别，所以DJI Pilot 2中 mqtt url地址需要使用tcp:// ws://

只有加载了对应的模块，模块内的js接口才能正常工作

* 模块js接口

1. 获取连接状态：`window.djiBridge.thingGetConnectState() : Boolean`
2. 启动连接：`window.djiBridge.thingConnect(String userName, String passwd, String callback)`
3. 关闭连接：`window.djiBridge.thingDisconnect()`
4. 设置回调函数：`window.thing.setConnectCallback(String callback)`
5. 返回设置的参数param：`window.djiBridge.thingGetConfigs(): String`

## [#](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#%E7%9B%B4%E6%92%AD%E6%A8%A1%E5%9D%97)直播模块

* name: liveshare
* param:

```json
{
  videoPublishType: video-on-demand,  //直播方式，服务器点播，手动点播，混合模式
  statusCallback: js_callback, // 直播状态回调
}
```

* 模块js接口

1. 设置直播模式：`window.djiBridge.liveshareSetVideoPublishType(String type)`
   参数：
   `video-on-demand`：服务器点播，依赖于thing模块，具体的点播命令参见设备物模型的直播服务。
   `video-by-manual`：手动点播，配置好直播类型参数之后，在图传页面可修改直播参数，停止直播。
   `video-demand-aux-manual`：混合模式，支持服务器点播，以及图传页面修改直播参数，停止直播。
2. 获取直播参数：`window.djiBridge.liveshareGetConfig(): String`
   返回值：
   ```json
   {
       type: Int, //直播类型 0:未知直播，1：声网，2：RTMP，3：RTSP，4：GB28181
       params: {   //参考liveshareManualStart参数说明
       }
   }
   ```
3. App端手动发起直播：`window.djiBridge.liveshareSetConfig(type: Int, params: String)`
   参数：
   ```json
   //type:1   agora
   {
       uid: xxxxx,
       token: xxxxx,
       channelId: xxxxx
   }
   //type:2   RTMP
   {
       url: xxxxxx.xxxxx.xxxxxx.xxx
   }
   //type:3   RTSP
   {
       userName: xxx,
       password: xxx,
       port: xxxx
   }
   //type:4  GB28181
   {
       serverIp: xxx,      //服务器IP
       serverPort: xxx,    //服务器端口
       serverId: xxxx,     //服务器ID
       agentId: xxxx,      //客户帐号
       password: xxx,      //密码
       agentPort: xxx,     //本地端口
       agentChannel: xxx,  //通道号
   }
   ```
4. 直播状态监听：`window.djiBridge.liveshareSetStatusCallback(jsCallback)`
   返回值：
   ```json
   {
       type:Int, //参考上文中的直播类型
       status: Int,//直播状态， 0:未连接服务器，1:连接服务器，2:正在直播
       fps: Int, //推送帧率
       videoBitRate: Int, //视频码率
       rtt:Int, //延迟，有可能没有
       quality:Int, //清晰度，可参考mqtt点播的文档
       jitter:Int,
       dropRate:Int, //丢包率
   }
   ```
5. 获取直播状态：`window.djiBridge.liveshareGetStatus()`
   返回值：
   ```json
   {
       type:Int, //参考上文中的直播类型
       status: Int,//直播状态， 0:未连接服务器，1:连接服务器，2:正在直播
       fps: Int, //推送帧率
       videoBitRate: Int, //视频码率
       rtt:Int, //延迟，有可能没有
       quality:Int, //清晰度，可参考mqtt点播的文档
       jitter:Int,
       dropRate:Int, //丢包率
   }
   ```
6. 开启App端手动直播：`window.djiBridge.liveshareStartLive()`
7. 结束App端手动直播：`window.djiBridge.liveshareStopLive()`

## [#](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#api%E6%A8%A1%E5%9D%97)API模块

借助HTTPS实现的功能模块有地图模块、航线管理模块、媒体管理模块、态势感知模块，它们依赖于 API 模块。若 API 模块的参数重新加载，则依赖 API 模块的功能模块也需要重新加载。

* name: api
* param:
  ```text
  {
      host: url,    //HTTP接口中的 ： {URI-scheme}://{Endpoint}
      token: token  //header中将会带上该X-Auth-Token, 
  }
  ```
* 模块js接口
  1. 获取设置的token：`window.djiBridge.apiGetToken()`
  2. 重新设置token：`window.djiBridge.apiSetToken(String token)`
  3. 获取设置的host：`window.djiBridge.apiGetHost()`

## [#](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#ws%E6%A8%A1%E5%9D%97)WS模块

连接示例：wss://xxx.xxxx.xxx:8883?x-auth-token=msikdixkFksikflaol

* name: ws
* param:
  ```text
  {
      host: url, //连接示例中的 wss://xxx.xxxx.xxx:8883
      token: token, //token 将会被urlencode之后拼接在x-auth-token中
      connectCallback: js_callback // 连接上之后将会回调js_callback
  }
  ```
* 模块js接口
  1. 获取连接状态：`window.djiBridge.wsGetConnectState()`
  2. 重新连接：`window.djiBridge.wsConnect(String host, String token, String callback)`
  3. 断开连接：`window.djiBridge.wsDisconnect()`
  4. 发送消息:`window.djiBridge.wsSend(String msg)` , 消息格式参考Websocket接口说明

## [#](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#%E5%9C%B0%E5%9B%BE%E5%85%83%E7%B4%A0%E6%A8%A1%E5%9D%97)地图元素模块

* name:map
* param:

```json
{
  userName:name,  //用户名称，用于当创建地图元素时，元素的名称
  elementPreName:newName   //地图元素序号前缀
}
```

*注意：在加载“地图元素”模块之前，需要先加载“设备上云模块”和websocket。*

* 模块js接口

1. 设置用户名称：`window.djiBridge.mapSetUserName()`
2. 设置新增元素序号前缀：`window.djiBridge.mapSetElementPreName()`

## [#](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#tsa%E6%80%81%E5%8A%BF%E6%84%9F%E7%9F%A5%E6%A8%A1%E5%9D%97)TSA态势感知模块

* name:tsa
* param:

```json
{}
```

*注意：在加载“地图元素”模块之前，需要先加载“设备上云模块”和websocket。同时参数需要传入{} 空大括号*

## [#](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#media%E5%AA%92%E4%BD%93%E6%A8%A1%E5%9D%97)Media媒体模块

* name: media
* param:

  ```text
  {
      autoUploadPhoto: boolean, //是否自动上传图片, 非必需
      autoUploadPhotoType: int, //自动上传的照片类型，0：原图， 1：缩略图， 非必需
      autoUploadVideo: boolean // 是否自动上传视频， 非必需
  }
  ```

  *注意：在加载“Media媒体”模块之前，需要先加载“设备上云模块”，同时媒体库内部逻辑依赖workspace工作空间参数，需要先配置。*
* 模块js接口

  1. 设置自动上传照片状态：`window.djiBridge.mediaSetAutoUploadPhoto(boolean auto)`
  2. 获取自动上传照片状态：`window.djiBridge.mediaGetAutoUploadPhoto() : boolean`
  3. 设置自动上传照片类型：`window.djiBridge.mediaSetUploadPhotoType(int type)`
  4. 获取自动上传照片类型：`window.djiBridge.mediaGetUploadPhotoType()`
  5. 设置自动上传视频状态：`window.djiBridge.mediaSetAutoUploadVideo(boolean auto)`
  6. 获取自动上传视频状态：`window.djiBridge.mediaGetAutoUploadVideo() : boolean`
  7. 设置后台自动下载的遥控器：`window.djiBridge.mediaSetDownloadOwner(int rc)` 0：本控，1：其他控
  8. 获取后台自动下载的遥控器编号：`window.djiBridge.mediaGetDownloadOwner(): int` 0：本控，1：其他控

## [#](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#%E8%88%AA%E7%BA%BF%E6%A8%A1%E5%9D%97)航线模块

* name:mission
* param:

```json
{}
```

*注意：在加载航线模块之前，需要先加载“设备上云模块”。同时参数需要传入{} 空大括号*

## [#](https://developer.dji.com/doc/cloud-api-tutorial/cn/api-reference/pilot-to-cloud/jsbridge.html#mop%E6%A8%A1%E5%9D%97)MOP模块

* name:mop
* param:

  ```text
  {
      host: path.mop, //mop websocket地址
      token: apiEnv.xToken, //平台token
      connectCallback: "mopModule.wsCallback" //回调函数
  }
  ```
