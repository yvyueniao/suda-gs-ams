# suda_union接口文档

baseURL:



### 登录接口

url：/login

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
 password是用户的密码，注意这个密码需要进行加密后再进行发送
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

### 批量插入用户

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





### 查询活动/讲座





### 删除活动/讲座





### 活动/讲座报名





### 活动/讲座取消报名