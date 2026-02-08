# suda_union接口文档

baseURL:



### 登录

url：/suda_login

请求方式：POST

请求格式：application/json

请求参数说明：

```json
{
    "username": "20254227087",
    "password": "123"
}
/**
 username是可以是用户的账号
 password是用户的密码
*/
```

返回值说明：

```json
{
    "code": 200,
    "msg": "认证成功",
    "data": {
        "user": {
            "id": 1,
            "username": "20254227087",
            "name": "梁靖松",
            "invalid": true,
            "role": 2,
            "menuPermission": null,
            "email": "123@qq.com",
            "major": "软件工程",
            "grade": "1",
            "createTime": "2026-02-01 12:00:30",
            "lastLoginTime": "2026-02-01 18:10:05"
        },
        "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyMDI1NDIyNzA4NyIsImlhdCI6MTc2OTk0MDgxOCwiZXhwIjoxNzcwMDI3MjE4fQ.xCYUoyJV2GxqOmAI7ioda4om9JddDWgeKwA7qsGW31Y"
    },
    "timestamp": 1769940818873
}

状态码：200是登录成功，其他的可以直接抛出msg给用户提示

"username":       用户名
"name":           姓名
"invalid":        是否为有效账户
"role":           角色 0:管理员/1:主席/2:部长/3:干事/4:普通学生
"menuPermission": 菜单权限（现在我们设计的是菜单权限根据身份决定，所以这个字段暂时用不上）
"email":          邮件
"major":          专业
"grade":          年级
"createTime":     创建时间
"lastLoginTime":  上次登录时间
"token":          用户token，用于后续认证
"timestamp":      当前时间戳
```



### 验证token的有效性

url：/token

请求方式：POST

请求头：Authorization: token值

请求参数说明：无参数

返回值说明：

```json
{
    "code": 200,
    "msg": "token有效",
    "data": {
        "id": 1,
        "username": "20254227087",
        "name": "梁靖松",
        "invalid": true,
        "role": 2,
        "menuPermission": null,
        "email": "123@qq.com",
        "major": "软件工程",
        "grade": "1",
        "createTime": "2026-02-01 12:00:30",
        "lastLoginTime": "2026-02-01 18:13:38"
    },
    "timestamp": 1769940841469
}
```



### 用户修改邮箱

url：/user/updateEmail

请求方式：POST

请求头：Authorization: token值

请求参数说明：

```json
{
    "email": "44556677@gmail.com"
}
```

返回值说明：

```json
{
    "code": 200,
    "msg": "操作成功",
    "data": "成功修改1条数据",
    "timestamp": 1770538503284
}
```



### 用户修改密码

url：/user/modifyPassword

请求方式：POST

请求头：Authorization: token值

请求参数说明：

```json
{
    "oldPassword": "123",
    "newPassword1": "123456",
    "newPassword2": "123456"
}
说明：newPassword1要和newPassword2一致
```

返回值说明：

```json
{
    "code": 200,
    "msg": "操作成功",
    "data": "成功修改1条数据",
    "timestamp": 1770539369808
}
```



### 用户忘记密码

#### 获取验证码

url：/user/send-verify-code

请求方式：POST

请求参数说明：

```json
{
    "username": "20254227087"
}
```

返回值说明：

```json
{
    "code": 200,
    "msg": "发送成功",
    "data": null,
    "timestamp": 1770557147431
}
```



#### 修改密码

url：/user/forget-password

请求方式：POST

请求参数说明：

```json
{
    "username": "20254227087",
    "verifyCode": "440202",
    "newPassword": "123"
}
```

返回值说明：

```json
{
    "code": 200,
    "msg": "操作成功",
    "data": "成功修改1条数据",
    "timestamp": 1770557428034
}
```



### 获取菜单

url：/menuList

请求方式：POST

请求格式：application/json

请求头：Authorization: token值

请求参数说明：无参数

返回值说明：

```json
{
    "code": 200,
    "msg": "获取成功",
    "data": [
        {
            "key": "apply",
            "label": "活动/讲座报名",
            "children": [
                {
                    "key": "apply_list",
                    "label": "活动/讲座列表",
                    "children": []
                }
            ]
        },
        {
            "key": "feedback",
            "label": "反馈中心",
            "children": [
                {
                    "key": "my_feedback",
                    "label": "我的反馈",
                    "children": []
                }
            ]
        },
        {
            "key": "profile",
            "label": "个人中心",
            "children": [
                {
                    "key": "profile_info",
                    "label": "我的信息",
                    "children": []
                }
            ]
        }
    ],
    "timestamp": 1770020430667
}
```



## 活动/讲座相关接口

### 创建活动/讲座

url：/activity/create

请求方式：POST

请求格式：application/json

请求头：Authorization: token值

请求参数说明：

```json
{
    "name": "夜跑活动",
    "description": "夜跑有利于身心健康，能够让我们第二天的学习更加精力充沛",
    "signStartTime": "2026-02-04 14:00:00",
    "signEndTime": "2026-02-06 14:00:00",
    "fullNum": 200,
    "score": 20,
    "location": "东区操场",
    "activityStime": "2026-02-08 8:00:00",
    "activityEtime": "2026-03-15 22:00:00",
    "type": 0
}

name：		   活动/讲座名称
description：   描述
signStartTime： 报名开始时间
signEndTime：   报名截止时间
fullNum：       活动人数
score：         分数
location：      地点
activityStime： 活动/讲座开始时间
activityEtime： 活动/讲座结束时间
type：		   类型（0:活动/1:讲座）
**!!!注意：请严格满足signStartTime<signEndTime<activityStime<activityEtime!!!**
```

返回值说明：

```json
{
    "code": 200,
    "msg": "操作成功",
    "data": "成功添加1条数据",
    "timestamp": 1770188277591
}
code：200是插入成功，其他值弹出msg给用户提示
```

### 查询活动/讲座

#### 按ID查找

url：/activity/searchById

请求方式：POST

请求格式：application/json

请求头：Authorization: token值

请求参数说明：

```json
{
    "id": 1
}
```

返回值说明：

```json
{
    "code": 200,
    "msg": "操作成功",
    "data": {
        "activity": {
            "id": 1,
            "name": "夜跑活动",
            "description": "夜跑有利于身心健康，能够让我们第二天的学习更加精力充沛",
            "department": "文体部",
            "time": "2026-02-04 14:57:57",
            "signStartTime": "2026-02-04 14:00:00",
            "signEndTime": "2026-02-06 14:00:00",
            "fullNum": 200,
            "score": 20,
            "location": "东区操场",
            "activityStime": "2026-02-08 08:00:00",
            "activityEtime": "2026-03-15 22:00:00",
            "type": 0,
            "state": 1,
            "registeredNum": 1,
            "candidateNum": 0,
            "candidateSuccNum": 0,
            "candidateFailNum": 0
        }
    },
    "timestamp": 1770200688569
}
id: 活动/讲座id
name：名称
description：描述
time：创建时间
signStartTime：报名开始时间
signEndTime：报名截止时间
fullNum：活动/讲座人数
score：分数
location：位置
activityStime：开始时间
activityEtime：结束时间
type：类型（0:活动/1:讲座）
state：状态（0:未开始/1:报名中/2:报名结束/3:进行中/4:已结束）
registeredNum：报名成功人数
candidateNum：候补人数
candidateSuccNum：候补成功人数
candidateFailNum：候补失败人数
```

#### 查找所有

url：/activity/searchAll

请求方式：POST

请求格式：application/json

请求头：Authorization: token值

请求参数说明：无参数

返回值说明：

```json
{
    "code": 200,
    "msg": "操作成功",
    "data": [
        {
            "id": 1,
            "name": "夜跑活动",
            "description": "夜跑有利于身心健康，能够让我们第二天的学习更加精力充沛",
            "department": "文体部",
            "time": "2026-02-04 14:57:57",
            "signStartTime": "2026-02-04 14:00:00",
            "signEndTime": "2026-02-06 14:00:00",
            "fullNum": 200,
            "score": 20,
            "location": "东区操场",
            "activityStime": "2026-02-08 08:00:00",
            "activityEtime": "2026-03-15 22:00:00",
            "type": 0,
            "state": 1,
            "registeredNum": 1,
            "candidateNum": 0,
            "candidateSuccNum": 0,
            "candidateFailNum": 0
        },
        {
            "id": 2,
            "name": "夜跑活动2",
            "description": "夜跑有利于身心健康，能够让我们第二天的学习更加精力充沛",
            "department": "文体部",
            "time": "2026-02-04 18:49:26",
            "signStartTime": "2026-02-04 14:00:00",
            "signEndTime": "2026-02-06 14:00:00",
            "fullNum": 200,
            "score": 20,
            "location": "东区操场",
            "activityStime": "2026-02-08 08:00:00",
            "activityEtime": "2026-03-15 22:00:00",
            "type": 0,
            "state": 1,
            "registeredNum": 1,
            "candidateNum": 0,
            "candidateSuccNum": 0,
            "candidateFailNum": 0
        }
    ],
    "timestamp": 1770202413517
}
```

#### 查找自己相关的活动

url：/activity/userApplications

请求方式：POST

请求格式：application/json

请求头：Authorization: token值

请求参数说明：无参数

返回值说明：

```json
{
    "code": 200,
    "msg": "操作成功",
    "data": [
        {
            "activityId": 1,
            "username": "20254227087",
            "state": 0,
            "time": "2026-02-01 13:09:13",
            "attachment": null,
            "checkIn": true,
            "getScore": true,
            "type": 0,
            "score": 1,
            "checkOut": false,
            "activityName": "夜跑活动"
        },
        {
            "activityId": 2,
            "username": "20254227087",
            "state": 0,
            "time": "2026-02-01 13:10:24",
            "attachment": null,
            "checkIn": false,
            "getScore": true,
            "type": 1,
            "score": 5,
            "checkOut": false,
            "activityName": "夜跑活动2"
        }
    ],
    "timestamp": 1770358282379
}

activityId：报名活动/讲座的ID
username：用户名
state：报名状态(0:报名成功/1:候补中/2:候补成功/3:候补失败)
time：申请时间
attachment：附件url地址
checkIn：是否签到
getScore：是否能够加分
type：活动类型(0:活动/1:讲座)
score：分数
checkOut：是否签退
```

#### 查找自己能管理的活动/讲座

url：/activity/ownActivity

请求方式：POST

请求格式：application/json

请求头：Authorization: token值

请求参数说明：无参数

返回值说明：

```json
{
    "code": 200,
    "msg": "操作成功",
    "data": [
        {
            "id": 1,
            "name": "夜跑活动",
            "description": "夜跑有利于身心健康，能够让我们第二天的学习更加精力充沛",
            "department": "文体部",
            "time": "2026-02-04 14:57:57",
            "signStartTime": "2026-02-01 10:00:00",
            "signEndTime": "2026-02-04 10:00:00",
            "fullNum": 100,
            "score": 3,
            "location": "东区操场",
            "activityStime": "2026-02-04 20:00:00",
            "activityEtime": "2026-02-04 21:00:00",
            "type": 0,
            "state": 4,
            "registeredNum": 1,
            "candidateNum": 0,
            "candidateSuccNum": 0,
            "candidateFailNum": 0
        }
    ],
    "timestamp": 1770368981026
}
```



### 修改活动/讲座信息

url：/activity/updateActivityInfo

请求方式：POST

请求格式：application/json

请求头：Authorization: token值

请求参数说明：

```json
{
    "id": 1,
    "signStartTime": "2026-02-1 10:00:00",
    "signEndTime": "2026-02-4 10:00:00",
    "fullNum": 100,
    "score": 3,
    "activityStime": "2026-02-4 20:00:00",
    "activityEtime": "2026-02-4 21:00:00"
}
说明：id是必要的参数；其他的参数是用户要修改的参数，如果不要修改则不传，比如只修改活动分数，则传参如下：
{
    "id": 1,
    "score": 3
}
```

返回值说明：

```json
{
    "code": 200,
    "msg": "操作成功",
    "data": null,
    "timestamp": 1770349391501
}
```



### 删除活动/讲座

url：/activity/delete

请求方式：POST

请求格式：application/json

请求头：Authorization: token值

请求参数说明：

```json
{
    "id": 5
}
id：活动id
```

返回值说明：

```json
{
    "code": 200,
    "msg": "操作成功",
    "data": "成功删除1条数据",
    "timestamp": 1770370654037
}
code 200是成功，其他的都有对应错误信息在msg
```



### 活动/讲座报名

#### 报名

url：/activity/register

请求方式：POST

请求格式：application/json

请求头：Authorization: token值

请求参数说明：

```json
{
    "id": 1
}
id：活动id
```

返回值说明：

```json
{
    "code": 200,
    "msg": "操作成功",
    "data": "成功报名1个活动",
    "timestamp": 1770472506633
}
code 200是成功，其他的都有对应错误信息在msg
```



#### 候补

url：/activity/candidate

请求方式：POST

请求格式：application/json

请求头：Authorization: token值

请求参数说明：

```json
{
    "id": 1
}
id：活动id
```

返回值说明：

```json
{
    "code": 200,
    "msg": "操作成功",
    "data": "成功候补1个活动",
    "timestamp": 1770475075826
}
code 200是成功，其他的都有对应错误信息在msg
注意：当且仅当报名人数未满时，才能候补
```



### 活动/讲座取消报名

**注意：距离活动开始不足12h时，不能取消**

#### 取消报名/候补

url：/activity/cancel

请求方式：POST

请求格式：application/json

请求头：Authorization: token值

请求参数说明：

```json
{
    "id": 1
}
id：活动id
```

返回值说明：

```json
{
    "code": 200,
    "msg": "操作成功",
    "data": "成功取消1个活动",
    "timestamp": 1770478064107
}
code 200是成功，其他的都有对应错误信息在msg
```



### 活动/讲座签到





### 活动/讲座签退





### 活动/讲座全部签退(无需签退的情况)



### 录入加分信息(特殊加分情况)





## 成员管理

### 批量插入用户(admin权限)

url：/user/batchInsertUser

请求方式：POST

请求格式：application/json

请求头：Authorization: token值

请求参数说明：

```json
[
    {
        "username": "20234227087",
        "password": "PSLJAH==9238KISJ",
        "name": "李四",
        "email": "123456@qq.com",
        "major": "计算机科学与技术",
        "grade": "研一"
    },
    {
        "username": "20224227089",
        "password": "PSLJAH==9238KISJ",
        "name": "王二",
        "email": "1234567@qq.com",
        "major": "计算机科学与技术",
        "grade": "博一"
    }
]
```

返回值说明：

```json
{
    "code": 200,
    "msg": "操作成功",
    "data": "成功添加2条数据",
    "timestamp": 1770010244887
}
code：200是插入成功，其他值弹出msg给用户提示
```



### 创建单个用户(admin权限)





### 删除用户(admin权限)





### 任命职务





### 获取用户信息

url：/user/info

请求方式：POST

请求格式：application/json

请求头：Authorization: token值

请求参数说明：无参数

返回值说明：

```json
{
    "code": 200,
    "msg": "获取成功",
    "data": {
        "user": {
            "id": 1,
            "username": "20254227087",
            "name": "梁靖松",
            "invalid": true,
            "role": 2,
            "menuPermission": null,
            "email": "123@qq.com",
            "major": "软件工程",
            "grade": "1",
            "createTime": "2026-02-01 12:00:30",
            "lastLoginTime": "2026-02-01 18:28:59",
            "serviceScore": 1,
            "lectureNum": 0,
            "department": null
        },
        "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyMDI1NDIyNzA4NyIsImlhdCI6MTc2OTkzOTYxMSwiZXhwIjoxNzcwMDI2MDExfQ.4fFRsxpsddQpB8P1b_N4t08_paCW-OQn-xIoUyySEzM"
    },
    "timestamp": 1769943234460
}


"username":       用户名
"name":           姓名
"invalid":        是否无效
"role":           角色 0:管理员/1:主席/2:部长/3:干事/4:普通学生
"menuPermission": 菜单权限
"email":          邮件
"major":          专业
"grade":          年级
"createTime":     创建时间
"lastLoginTime":  上次登录时间
"token":          用户token，用于后续认证
"timestamp":      当前时间戳
"serviceScore":   社会服务分
"lectureNum":     学术讲座次数
"department":     部门
```





## 部门管理

### 创建部门





### 删除部门







### 获取所有部门





### 获取某个部门成员





## 反馈

### 创建反馈





### 获取所有反馈





### 获取自己的反馈







### 查看反馈信息





### 回复反馈





### 结束反馈









## 日志
