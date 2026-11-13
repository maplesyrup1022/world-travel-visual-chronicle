# world-travel-visual-chronicle

做一个网页来展示一个人过去几年的旅居、旅游、观看演出经历。layout是一个世界地图，可以调整时间filter。用户在其中添加照片、视频、多媒体内容，内容有地点和时间标识，可以按照地点查看在一个地方拍摄的所有照片，也可以根据时间看到这一年我某几个月再哪个国家，做了什么，按照年份生成统计报告。

项目主要目的想进行时间线梳理。相册中可以选择时间段，但相关照片没有tag，我不知道那段时间我的主要经历，也没有总结说这一年中一共去了哪些地方，一共经历了哪些事情。

以这个思路，首先做数据库结构，以life period为人生主题，一段大的时期，可能这段时间中发生的一些事情对人生整体有些新的思考，一个life period中有各种experience，代表每一件具体的活动和事件，并且可以和life period发生在不同地方，理想的添加顺序是用户首先创建一个大的life period，如旅居经历、旅游经历等，然后选取添加照片，以照片拍摄的位置和事件自动suggest添加新的experience，并让用户选择照片所关联的experience。

后端api implementation，针对每个表格数据类型完成get/post/put/delete methods.首页展示世界地图并highlight所有visited locations的get /locations/visited. hover onto specific location展示该地点所有相关life period、experience、media asset的get /locations/{location_id}/summary method.首页右下角可以有一个时间轴以及小人在其上行走，根据用户input会自动filter某年或具体某个时间段内的所有数据。根据所选时间段展示所有相关事件的get /timeline method以及这些事件的数据总结get /timeline/stats method。

前端完成基础components搭建，从react改到nextjs来完善routing。

媒体上传通过 `POST /media-assets/upload` 接收原始图片文件（最大 15 MB），支持 JPEG、PNG、WebP、GIF、BMP 和 iCloud 常见的 HEIC/HEIF 格式。首次设置后端环境时，使用启动后端的 Python 解释器运行 `python -m pip install -r requirements.txt` 安装依赖。后端会生成最长边为 512 像素的 JPEG 缩略图并保存在项目根目录的 `uploads/`，数据库保存 `/uploads/<文件名>.jpg` 作为 `file_url`。图片中的 EXIF 拍摄日期会作为 `captured_at` 的默认值；GPS 坐标会保存在媒体记录的 `latitude` 和 `longitude` 字段中。前端传入的拍摄日期优先于 EXIF 日期。现有数据库会在后端启动时为媒体表补充 GPS 坐标列。

AI chronicle summary 使用 OpenAI Python SDK 2.x 通过 ChatAnywhere 的 Chat Completions API。设置 `CHATANYWHERE_API_KEY`（或 SDK 通用的 `OPENAI_API_KEY`）环境变量后即可调用；可选用 `CHATANYWHERE_MODEL` 覆盖默认模型 `gpt-5.6-luna`。安装后端依赖时请用启动 Uvicorn 的同一个 Python 解释器运行 `python -m pip install -r requirements.txt`，避免把 SDK 安装到另一个 Python 环境；启动时也可用 `python -m uvicorn backend:api --reload` 确保解释器一致。

选择图片后，前端会先将图片发送到 `POST /media-assets/info`，读取 EXIF 拍摄日期与 GPS 坐标，并在保存前显示该日期对应的最多 5 条 experience；该检查不会保存文件或创建媒体记录。
存在 GPS 坐标时，`/media-assets/info` 会调用 Mapbox reverse geocoding，并将最多 5 个最近城市作为 `LocationCreate` 结构的 `locations` 返回。前端显示城市和国家并允许选择；保存媒体时会把所选地点保存为媒体的 location。
