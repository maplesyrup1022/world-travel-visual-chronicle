# world-travel-visual-chronicle

做一个网页来展示一个人过去几年的旅居、旅游、观看演出经历。layout是一个世界地图，可以调整时间filter。用户在其中添加照片、视频、多媒体内容，内容有地点和时间标识，可以按照地点查看在一个地方拍摄的所有照片，也可以根据时间看到这一年我某几个月再哪个国家，做了什么，按照年份生成统计报告。

项目主要目的想进行时间线梳理。相册中可以选择时间段，但相关照片没有tag，我不知道那段时间我的主要经历，也没有总结说这一年中一共去了哪些地方，一共经历了哪些事情。

以这个思路，首先做数据库结构，以life period为人生主题，一段大的时期，可能这段时间中发生的一些事情对人生整体有些新的思考，一个life period中有各种experience，代表每一件具体的活动和事件，并且可以和life period发生在不同地方，理想的添加顺序是用户首先创建一个大的life period，如旅居经历、旅游经历等，然后选取添加照片，以照片拍摄的位置和事件自动suggest添加新的experience，并让用户选择照片所关联的experience。

后端api implementation，针对每个表格数据类型完成get/post/put/delete methods.首页展示世界地图并highlight所有visited locations的get /locations/visited. hover onto specific location展示该地点所有相关life period、experience、media asset的get /locations/{location_id}/summary method.首页右下角可以有一个时间轴以及小人在其上行走，根据用户input会自动filter某年或具体某个时间段内的所有数据。根据所选时间段展示所有相关事件的get /timeline method以及这些事件的数据总结get /timeline/stats method。

前端完成基础components搭建，从react改到nextjs来完善routing。
