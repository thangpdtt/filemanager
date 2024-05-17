#!/usr/bin/env node

var koa =require('koa');
var path = require('path');
var tracer = require('tracer');
var mount = require('koa-mount');
var morgan = require('koa-morgan');
var koaStatic = require('koa-static');

// Config
var argv = require('optimist')
  .usage([
    'USAGE: $0 [-p <port>] [-d <directory>]']
  )
  .option('port', {
    alias: 'p',
    'default': 5000,
    description: 'Server Port'
  })
  .option('directory', {
    alias: 'd',
    description: 'Root Files Directory'
  })
  .option('version', {
    alias: 'v',
    description: 'Server　Version'
  })
  .option('help', {
    alias: 'h',
    description: "Display This Help Message"
  })
  .argv;

if (argv.help) {
  require('optimist').showHelp(console.log);
  process.exit(0);
}

if (argv.version) {
  console.log('FileManager', require('./package.json').version);
  process.exit(0);
}

global.C = {
  data: {
    root: argv.directory || path.dirname('.')
  },
  logger: require('tracer').console({level: 'info'}),
  morganFormat: ':date[iso] :remote-addr :method :url :status :res[content-length] :response-time ms'
};

// Start Server
var Tools = require('./tools');

var startServer = function (app, port) {
  app.listen(port);
  C.logger.info('AAA---START---AAA');
  C.logger.info('listening on *.' + port);
};

var app = koa();
app.proxy = true;
app.use(Tools.handelError);
app.use(Tools.realIp);
app.use(morgan.middleware(C.morganFormat));

var IndexRouter = require('./routes');
app.use(mount('/', IndexRouter));
app.use(koaStatic(path.join(__dirname,'./public/')));

//------- JSON API ------
const imageDirectory = path.join(__dirname,'./public/media/');//'path/to/image/directory');

C.logger.info('AAAAAAAAABBBBBBBBBBBBB');
C.logger.info(imageDirectory);

// Hàm để đọc thông tin về tất cả các tập tin hình ảnh trong một thư mục (bao gồm cả thư mục con) và ghi nhận node cha của từng ảnh con
function readImagesAndParent(directory) {
  let images = [];
  fs.readdirSync(directory).forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      // Nếu đây là một thư mục, đệ quy vào nó và thu thập thông tin về các hình ảnh trong đó
      const subImages = readImagesAndParent(filePath);
      c.logger.info(filePath);
      // Thêm tên thư mục cha vào mỗi ảnh con
      subImages.forEach(img => {
        img.parent = file;
      });
      // Thêm danh sách các ảnh con vào mảng images
      images = images.concat(subImages);
    } else if (isImageFile(file)) {
      c.logger.info(filePath);
      // Nếu đây là một tập tin hình ảnh, thêm thông tin của nó vào mảng images và ghi nhận tên thư mục cha của nó
      images.push({
        name: file,
        path: filePath,
        size: stats.size,
        created_at: stats.birthtime,
        modified_at: stats.mtime,
        parent: path.basename(directory) // Ghi nhận tên thư mục cha
      });
    }
  });
  return images;
}


// Hàm kiểm tra xem một tập tin có phải là tập tin hình ảnh hay không (ở đây, chỉ kiểm tra phần mở rộng)
function isImageFile(file) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4'];
  const ext = path.extname(file).toLowerCase();
  return imageExtensions.includes(ext);
}

// Định nghĩa route API
app.use(mount('/api/media', async (ctx) => {
  // Nhóm các hình ảnh theo thư mục cha của chúng
  const imagesWithParent = readImagesAndParent(imageDirectory);

  const groupedImages = {};
  imagesWithParent.forEach(img => {
    if (!groupedImages[img.parent]) {
      groupedImages[img.parent] = [];
    }
    groupedImages[img.parent].push(img);
  });

  ctx.body = { groupedImages };
}));

startServer(app, +argv.port);