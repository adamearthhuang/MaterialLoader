/**
 * 圆形，一个球在几个球之间运动
 */
function RoundLoader(canvas) {
  this._canvas = canvas;
  this._context = this._canvas.getContext('2d');
  this._fps = 60;
  this.init({});
}

/**
 * 初始化
 */
RoundLoader.prototype.init = function (option) {
  /** 获取option参数的静态圆半径，默认为50 */
  this._bigCircleRadius = parseFloat(option.bigCircleRadius) || 50;
  /** 获取option参数的静态圆半径变化比率，默认为0.4 */
  this._staticCircleRadiusScaleRate = parseFloat(option.staticCircleRadiusScaleRate) || 0.4;
  /** 获取option参数的画笔的填充颜色，默认为'#4DB9FF' */
  this._fillColor = option.fillColor || '#4DB9FF';
  /** 获取option参数的动画持续时间（毫秒），默认为2000 */
  this._duration = parseInt(this._fps * (option.duration / 1000)) || this._fps * (2000 / 1000);

  /** 静态圆数量*/
  this._staticCircleCount = 8;
  /** 静态圆半径 */
  this._staticCircleRadius = this._bigCircleRadius / 5;
  /** 设置粘连体长度 */
  this._adherentLength = this._staticCircleRadius * 2.5;
  /** 设置画布宽度、高度 */
  this._canvas.width = this._canvas.height = 2 * (this._bigCircleRadius + this._staticCircleRadius * (1 + this._staticCircleRadiusScaleRate));

  /** 设置当前帧为0 */
  this._frame = 0;

  /** 设置大圆参数 */
  this._bigCircle = {};
  this._bigCircle.r = this._bigCircleRadius;
  this._bigCircle.x = this._canvas.width / 2;
  this._bigCircle.y = this._canvas.height / 2;

  /** 设置动态圆参数 */
  this._dynamicCircle = {};
  this._dynamicCircle.r = this._staticCircleRadius * 3 / 4;
  this._dynamicCircle.x = this._bigCircle.x;
  this._dynamicCircle.y = this._staticCircleRadius * (1 + this._staticCircleRadiusScaleRate);

  /** 设置静态圆参数 */
  this._staticCircles = [];
  for (var i = 0; i < this._staticCircleCount; i++) {
    var circle = {};
    circle.r = this._staticCircleRadius;
    circle.x = this._bigCircle.x + this._bigCircle.r * Math.cos((45 * i) * Math.PI / 180);
    circle.y = this._bigCircle.x + this._bigCircle.r * Math.sin((45 * i) * Math.PI / 180);
    this._staticCircles.push(circle);
  }

  /** 设置画笔 */
  this._setPaint(this._fillColor);
}

/**
 * 开始
 */
RoundLoader.prototype.start = function () {
  this._invalidate();
  this._validate(this);
}

/**
 * 停止
 */
RoundLoader.prototype.stop = function () {
  this._invalidate();
}

/**
 * 设置画笔
 */
RoundLoader.prototype._setPaint = function (fillColor) {
  this._context.fillStyle = fillColor;
}

/**
 * 界面刷新的时候会进行回调
 */
RoundLoader.prototype._onDraw = function () {
  /** 获取动态圆此刻计算的角度 */
  if (this._frame > this._duration) {
    this._frame = 0;
  }
  var degrees = this._easeInOutSine(this._frame, -90, 270, this._duration);

  /** 计算动态圆坐标 */
  this._dynamicCircle.x2 = this._bigCircle.x + this._bigCircle.r * Math.cos((degrees / 180) * Math.PI);
  this._dynamicCircle.y2 = this._bigCircle.y + this._bigCircle.r * Math.sin((degrees / 180) * Math.PI);

  /** 绘制动态圆 */
  this._drawCircle(this._dynamicCircle.x2, this._dynamicCircle.y2, this._dynamicCircle.r);

  /** 绘制静态圆 */
  for (var i = 0; i < this._staticCircles.length; i++) {
    var staticCircle = this._staticCircles[i];

    /** 在绘制静态圆的时候，判断该静态圆是否允许绘制粘连体 */
    if (this._adherentBodyEnable(staticCircle)) {
      this._drawCircle(staticCircle.x, staticCircle.y, staticCircle.r2);
      this._drawAdherentBody(staticCircle.x, staticCircle.y, staticCircle.r2, 45,
        this._dynamicCircle.x2, this._dynamicCircle.y2, this._dynamicCircle.r, 45);

    } else {
      this._drawCircle(staticCircle.x, staticCircle.y, staticCircle.r);
    }
  }
}

/**
 * 绘制圆形
 */
RoundLoader.prototype._drawCircle = function (x, y, r) {
  this._context.beginPath();
  this._context.arc(x, y, r, 0, Math.PI * 2);
  this._context.fill();
  this._context.closePath();
}

/**
 * 判断是否允许绘制粘连体
 */
RoundLoader.prototype._adherentBodyEnable = function (staticCircle) {
  /** 勾股定理计算静态圆与动态圆之间的圆心距离 */
  var distance = Math.sqrt(Math.pow(this._dynamicCircle.x2 - staticCircle.x, 2) + Math.pow(this._dynamicCircle.y2 - staticCircle.y, 2));

  /** 计算静态圆的半径变化*/
  var scale = this._staticCircleRadiusScaleRate - this._staticCircleRadiusScaleRate * (distance / this._adherentLength);
  staticCircle.r2 = staticCircle.r * (1 + scale);

  /** 判断是否可以绘制粘连体 */
  if (distance < this._adherentLength)
    return true;
  else
    return false;
}

/**
 * 先加速后减速的正弦缓动函数
 */
RoundLoader.prototype._easeInOutSine = function (time, startValue, endValue, duration) {
  return startValue + (1 - Math.cos(Math.PI * time / duration)) * ((endValue - startValue) / 2);
}

/**
 * 利用贝塞尔曲线绘制粘连体
 */
RoundLoader.prototype._drawAdherentBody = function (cx1, cy1, cr1, offset1, cx2, cy2, cr2, offset2) {
  /** 求三角函数 */
  var degrees = (Math.atan(Math.abs(cy2 - cy1) / Math.abs(cx2 - cx1))) * 180 / Math.PI;

  /** 计算圆1与圆2之间的圆心距离 */
  var differenceX = cx1 - cx2;
  var differenceY = cy1 - cy2;

  /** 两条贝塞尔曲线的四个端点 */
  var x1, y1, x2, y2, x3, y3, x4, y4;

  /** 圆1在圆2的下边 */
  if (differenceX == 0 && differenceY > 0) {
    x2 = cx2 - cr2 * Math.sin(offset2 * Math.PI / 180);
    y2 = cy2 + cr2 * Math.cos(offset2 * Math.PI / 180);
    x4 = cx2 + cr2 * Math.sin(offset2 * Math.PI / 180);
    y4 = cy2 + cr2 * Math.cos(offset2 * Math.PI / 180);
    x1 = cx1 - cr1 * Math.sin(offset1 * Math.PI / 180);
    y1 = cy1 - cr1 * Math.cos(offset1 * Math.PI / 180);
    x3 = cx1 + cr1 * Math.sin(offset1 * Math.PI / 180);
    y3 = cy1 - cr1 * Math.cos(offset1 * Math.PI / 180);

  }
  /** 圆1在圆2的上边 */
  else if (differenceX == 0 && differenceY < 0) {
    x2 = cx2 - cr2 * Math.sin(offset2 * Math.PI / 180);
    y2 = cy2 - cr2 * Math.cos(offset2 * Math.PI / 180);
    x4 = cx2 + cr2 * Math.sin(offset2 * Math.PI / 180);
    y4 = cy2 - cr2 * Math.cos(offset2 * Math.PI / 180);
    x1 = cx1 - cr1 * Math.sin(offset1 * Math.PI / 180);
    y1 = cy1 + cr1 * Math.cos(offset1 * Math.PI / 180);
    x3 = cx1 + cr1 * Math.sin(offset1 * Math.PI / 180);
    y3 = cy1 + cr1 * Math.cos(offset1 * Math.PI / 180);

  }
  /** 圆1在圆2的右边 */
  else if (differenceX > 0 && differenceY == 0) {
    x2 = cx2 + cr2 * Math.cos(offset2 * Math.PI / 180);
    y2 = cy2 + cr2 * Math.sin(offset2 * Math.PI / 180);
    x4 = cx2 + cr2 * Math.cos(offset2 * Math.PI / 180);
    y4 = cy2 - cr2 * Math.sin(offset2 * Math.PI / 180);
    x1 = cx1 - cr1 * Math.cos(offset1 * Math.PI / 180);
    y1 = cy1 + cr1 * Math.sin(offset1 * Math.PI / 180);
    x3 = cx1 - cr1 * Math.cos(offset1 * Math.PI / 180);
    y3 = cy1 - cr1 * Math.sin(offset1 * Math.PI / 180);
  }
  /** 圆1在圆2的左边 */
  else if (differenceX < 0 && differenceY == 0) {
    x2 = cx2 - cr2 * Math.cos(offset2 * Math.PI / 180);
    y2 = cy2 + cr2 * Math.sin(offset2 * Math.PI / 180);
    x4 = cx2 - cr2 * Math.cos(offset2 * Math.PI / 180);
    y4 = cy2 - cr2 * Math.sin(offset2 * Math.PI / 180);
    x1 = cx1 + cr1 * Math.cos(offset1 * Math.PI / 180);
    y1 = cy1 + cr1 * Math.sin(offset1 * Math.PI / 180);
    x3 = cx1 + cr1 * Math.cos(offset1 * Math.PI / 180);
    y3 = cy1 - cr1 * Math.sin(offset1 * Math.PI / 180);
  }
  /** 圆1在圆2的右下角 */
  else if (differenceX > 0 && differenceY > 0) {
    x2 = cx2 - cr2 * Math.cos((180 - offset2 - degrees) * Math.PI / 180);
    y2 = cy2 + cr2 * Math.sin((180 - offset2 - degrees) * Math.PI / 180);
    x4 = cx2 + cr2 * Math.cos((degrees - offset2) * Math.PI / 180);
    y4 = cy2 + cr2 * Math.sin((degrees - offset2) * Math.PI / 180);
    x1 = cx1 - cr1 * Math.cos((degrees - offset1) * Math.PI / 180);
    y1 = cy1 - cr1 * Math.sin((degrees - offset1) * Math.PI / 180);
    x3 = cx1 + cr1 * Math.cos((180 - offset1 - degrees) * Math.PI / 180);
    y3 = cy1 - cr1 * Math.sin((180 - offset1 - degrees) * Math.PI / 180);
  }
  /** 圆1在圆2的左上角 */
  else if (differenceX < 0 && differenceY < 0) {
    x2 = cx2 - cr2 * Math.cos((degrees - offset2) * Math.PI / 180);
    y2 = cy2 - cr2 * Math.sin((degrees - offset2) * Math.PI / 180);
    x4 = cx2 + cr2 * Math.cos((180 - offset2 - degrees) * Math.PI / 180);
    y4 = cy2 - cr2 * Math.sin((180 - offset2 - degrees) * Math.PI / 180);
    x1 = cx1 - cr1 * Math.cos((180 - offset1 - degrees) * Math.PI / 180);
    y1 = cy1 + cr1 * Math.sin((180 - offset1 - degrees) * Math.PI / 180);
    x3 = cx1 + cr1 * Math.cos((degrees - offset1) * Math.PI / 180);
    y3 = cy1 + cr1 * Math.sin((degrees - offset1) * Math.PI / 180);
  }
  /** 圆1在圆2的左下角 */
  else if (differenceX < 0 && differenceY > 0) {
    x2 = cx2 - cr2 * Math.cos((degrees - offset2) * Math.PI / 180);
    y2 = cy2 + cr2 * Math.sin((degrees - offset2) * Math.PI / 180);
    x4 = cx2 + cr2 * Math.cos((180 - offset2 - degrees) * Math.PI / 180);
    y4 = cy2 + cr2 * Math.sin((180 - offset2 - degrees) * Math.PI / 180);
    x1 = cx1 - cr1 * Math.cos((180 - offset1 - degrees) * Math.PI / 180);
    y1 = cy1 - cr1 * Math.sin((180 - offset1 - degrees) * Math.PI / 180);
    x3 = cx1 + cr1 * Math.cos((degrees - offset1) * Math.PI / 180);
    y3 = cy1 - cr1 * Math.sin((degrees - offset1) * Math.PI / 180);
  }
  /** 圆1在圆2的右上角 */
  else {
    x2 = cx2 - cr2 * Math.cos((180 - offset2 - degrees) * Math.PI / 180);
    y2 = cy2 - cr2 * Math.sin((180 - offset2 - degrees) * Math.PI / 180);
    x4 = cx2 + cr2 * Math.cos((degrees - offset2) * Math.PI / 180);
    y4 = cy2 - cr2 * Math.sin((degrees - offset2) * Math.PI / 180);
    x1 = cx1 - cr1 * Math.cos((degrees - offset1) * Math.PI / 180);
    y1 = cy1 + cr1 * Math.sin((degrees - offset1) * Math.PI / 180);
    x3 = cx1 + cr1 * Math.cos((180 - offset1 - degrees) * Math.PI / 180);
    y3 = cy1 + cr1 * Math.sin((180 - offset1 - degrees) * Math.PI / 180);
  }

  /** 贝塞尔曲线的控制点 */
  var anchorX1, anchorY1, anchorX2, anchorY2;

  /** 圆1大于圆2 */
  if (cr1 > cr2) {
    anchorX1 = (x2 + x3) / 2;
    anchorY1 = (y2 + y3) / 2;
    anchorX2 = (x1 + x4) / 2;
    anchorY2 = (y1 + y4) / 2;
  }
  /** 圆1小于或等于圆2 */
  else {
    anchorX1 = (x1 + x4) / 2;
    anchorY1 = (y1 + y4) / 2;
    anchorX2 = (x2 + x3) / 2;
    anchorY2 = (y2 + y3) / 2;
  }

  /** 绘制粘连体 */
  this._context.beginPath();
  this._context.moveTo(x1, y1);
  this._context.quadraticCurveTo(anchorX1, anchorY1, x2, y2);
  this._context.lineTo(x4, y4);
  this._context.quadraticCurveTo(anchorX2, anchorY2, x3, y3);
  this._context.lineTo(x1, y1);
  this._context.fill();
  this._context.closePath();
}

/**
 * 绘制
 */
RoundLoader.prototype._validate = function (self) {
  this._frame = 0;
  this._interval = setInterval(function () {
    self._clean();
    self._onDraw();
    self._frame++;
  }, 1000 / self._fps);
}

/**
 * 不绘制
 */
RoundLoader.prototype._invalidate = function () {
  clearInterval(this._interval);
  this._clean();
  this._frame = 0;
}

/**
 * 擦除画布
 */
RoundLoader.prototype._clean = function () {
  this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
}






