// Copyright (c) Ian Hunt-Isaak
// Distributed under the terms of the Modified BSD License.

import { DOMWidgetModel, DOMWidgetView, ISerializers, Dict } from '@jupyter-widgets/base';

import { MODULE_NAME, MODULE_VERSION } from './version';

import * as pako from 'pako';
import { data_union_serialization, getArray, listenToUnion } from 'jupyter-dataserializers';

// import ndarray = require('ndarray');
// import { toBytes } from './utils';

// Import the CSS
import '../css/widget.css';
import ndarray from 'ndarray';

function serializeImageData(image: ImageData) {
  // seems like it would make more sense to just pass the whole object
  // but then it just becomes mysterious bytes on the python side
  // this seems easier to figure out. maybe revist one day?
  console.log('serializing');
  const data = pako.deflate(new Uint8Array(image.data.buffer));
  return { width: image.width, height: image.height, data: data };
  // return { width: image.width, height: image.height, data: new DataView(image.data.buffer) };
}

function deserializeImageData(dataview: DataView | null) {
  //pretty sure that using this is not helpful??
  // oh nah this will be useful for setting the classes if you have some already
  return null;
  // if (dataview === null) {
  //   return null;
  // }

  // return new Uint8ClampedArray(dataview.buffer);
}

export class segmentModel extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: segmentModel.model_name,
      _model_module: segmentModel.model_module,
      _model_module_version: segmentModel.model_module_version,
      _view_name: segmentModel.view_name,
      _view_module: segmentModel.view_module,
      _view_module_version: segmentModel.view_module_version,
      erase_mode: false,
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    _labels: {
      serialize: serializeImageData,
      deserialize: deserializeImageData,
    },
    data: data_union_serialization,
  };

  initialize(attributes: any, options: any) {
    super.initialize(attributes, options);

    console.log('yikes');
    listenToUnion(this, 'data', this._updateClassData.bind(this), true);

    this.imgCanvas = document.createElement('canvas');
    this.classCanvas = document.createElement('canvas');
    this.imgContext = getContext(this.imgCanvas);
    this.classContext = getContext(this.classCanvas);

    this.on('msg:custom', this.onCommand.bind(this));
    this.on('change:erasing', this._erasingChanged.bind(this));

    // classCanvas should have the same size as the original image, and be drawn scaled.
    this.classCanvas.width = 100; //this.previewCanvas.width;
    this.classCanvas.height = 100; //this.previewCanvas.height;
    this.classContext.lineWidth = 2;
    this.classContext.fillStyle = 'rgb(0,255,255)';
    this.classContext.imageSmoothingEnabled = false;
  }

  private onCommand(command: any, buffers: any) {
    if (command.name === 'gogogo') {
      this.classContext.fillStyle = 'rgba(255,150,0,.5';
      this.classContext.fillRect(50, 50, 200, 200);
    } else if (command.name === 'image') {
      this.putImageData(command.metadata, buffers);
    } else if (command.name === 'beep') {
      this._forEachView((view) => {
        view.redraw();
      });
    } else if (command.name === 'gimme') {
      this.gimme();
    }
  }

  private async gimme() {
    // const bytes = await toBytes(this.classCanvas);
    const bytes = this.classContext.getImageData(
      0,
      0,
      this.classCanvas.width,
      this.classCanvas.height
    );

    console.log(bytes);
    this.set('_labels', bytes);
    this.save_changes();
  }

  private _updateClassData() {
    console.log('here?');
    const data = getArray(this.get('data'));
    if (data) {
      const imageData = new ImageData(
        new Uint8ClampedArray(data.data),
        data.shape[0],
        data.shape[1]
      );
      this.classContext.putImageData(imageData, 0, 0);
      console.log(this.classCanvas);
    }
    this._forEachView((view) => {
      view.resize();
      view.redraw();
    });
    console.log(data);
  }

  putImageData(bufferMetadata: any, buffers: any) {
    // const [bufferMetadata, dx, dy] = args;

    this.imgWidth = bufferMetadata.shape[1];
    this.imgHeight = bufferMetadata.shape[0];

    const data = new Uint8ClampedArray(buffers[0].buffer);
    const imageData = new ImageData(data, this.imgWidth, this.imgHeight);
    this.resizeDataCanvas(`${this.imgWidth}px`, `${this.imgHeight}px`);
    this.imgContext.putImageData(imageData, 0, 0);
    this._forEachView((view) => {
      view.resize();
      view.redraw();
    });
  }

  private _erasingChanged() {
    const erasing = this.get('erasing');
    if (erasing) {
      // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
      this.classContext.globalCompositeOperation = 'destination-out';
    } else {
      this.classContext.globalCompositeOperation = 'source-over';
    }
  }
  private resizeDataCanvas(width: string, height: string) {
    this.imgCanvas.setAttribute('width', width);
    this.imgCanvas.setAttribute('height', height);
    this.classCanvas.setAttribute('width', width);
    this.classCanvas.setAttribute('height', height);
  }

  //again from ipycanvas
  private _forEachView(callback: (view: segmentView) => void) {
    for (const view_id in this.views) {
      this.views[view_id].then((view: segmentView) => {
        callback(view);
      });
    }
  }
  static model_name = 'segmentModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'segmentView'; // Set to null if no view
  static view_module = MODULE_NAME; // Set to null if no view
  static view_module_version = MODULE_VERSION;
  imgCanvas: HTMLCanvasElement;
  classCanvas: HTMLCanvasElement;
  // displayCanvas: HTMLCanvasElement;
  // previewCanvas: HTMLCanvasElement;
  //ideally would use OffscreenCanvasRenderingContext2D for img and class
  // but firefox doesn't implement w/o opt-in yet
  // https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas#Browser_compatibility
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1390089
  imgContext: CanvasRenderingContext2D;
  classContext: CanvasRenderingContext2D;
  // displayContext: CanvasRenderingContext2D;
  // previewContext: CanvasRenderingContext2D;
  imgWidth: number;
  imgHeight: number;

  views: Dict<Promise<segmentView>>;
}

export class segmentView extends DOMWidgetView {
  render(): void {
    const container = document.createElement('div');
    // container.style.width = '500px';
    // container.style.height = '500px';
    this.displayCanvas = document.createElement('canvas');
    this.previewCanvas = document.createElement('canvas');
    this.previewCanvas.classList.add('preview');
    container.setAttribute('position', 'relative');
    this.el.appendChild(container);
    this.el.classList.add('segment-container');
    container.appendChild(this.displayCanvas);
    container.appendChild(this.previewCanvas);

    // console.log(this.el);
    // this.el
    this.previewContext = getContext(this.previewCanvas);
    this.displayContext = getContext(this.displayCanvas);
    this.previewContext.fillStyle = 'rgba(255, 0, 0, .3)'; //'#a4fae3';

    this.previewCanvas.addEventListener('mouseup', this._mouseUp);
    this.previewCanvas.addEventListener('mousedown', this._mouseDown);
    this.previewCanvas.addEventListener('mousemove', this._mouseMove);
    this.previewCanvas.addEventListener('wheel', this._wheel);
    this.previewCanvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    this._sHeight = this.model.classCanvas.height;
    this._sWidth = this.model.classCanvas.width;
    this.resize();
    this.drawImageScaled();
  }
  resize() {
    // TODO: this should probably also check for if the layout
    // has a non square aspect ratio
    // also there are so many different widths to pay attention to!!! grr
    // model.layout.width, I wonder how ipympl deals with this
    // maybe css trickery that I don't understand?
    const aspectRatio = this.model.imgWidth / this.model.imgHeight;
    if (aspectRatio > 1) {
      // this.displayWidth = 500;
      this.displayWidth = parseFloat(this.model.get('layout').get('width'));
      this.displayHeight = this.displayWidth / aspectRatio;
      this.intrinsicZoom = this.model.imgWidth / this.displayWidth;
    } else {
      // this.displayHeight = 500;
      this.displayHeight = parseFloat(this.model.get('layout').get('height'));
      this.displayWidth = this.displayHeight * aspectRatio;
      this.intrinsicZoom = this.model.imgHeight / this.displayHeight;
    }
    this.intrinsicZoom = 1;
    this.displayCanvas.setAttribute('width', `${this.displayWidth}px`);
    this.displayCanvas.setAttribute('height', `${this.displayHeight}px`);
    this.previewCanvas.setAttribute('width', `${this.displayWidth}px`);
    this.previewCanvas.setAttribute('height', `${this.displayHeight}px`);
    this.displayContext.imageSmoothingEnabled = false;
    this.previewContext.imageSmoothingEnabled = false;
    this.previewContext.fillStyle = 'rgba(255, 0, 0, .3)';
  }
  // gotta be an arrow function so we can keep on
  // using this to refer to the Drawing rather than
  // the clicked element
  private _mouseDown = (e: MouseEvent): void => {
    const [mouseX, mouseY] = this.canvasCoords(e);
    if (e.button === 0) {
      this.path = new Path2D();
      this.path.moveTo(mouseX, mouseY);
      this.lassoing = true;
    } else if (e.button === 1 || e.button === 2) {
      this._panStartX = this._Sx + (mouseX * this.intrinsicZoom) / this.userZoom;
      this._panStartY = this._Sy + (mouseY * this.intrinsicZoom) / this.userZoom;
      this.panning = true;
      e.preventDefault();
    }
  };
  private canvasCoords(e: MouseEvent): [number, number] {
    let mouseX = e.offsetX;
    let mouseY = e.offsetY;
    mouseX -= this.previewCanvas.offsetLeft;
    mouseY -= this.previewCanvas.offsetTop;
    return [mouseX, mouseY];
  }
  private _mouseUp = (e: MouseEvent): void => {
    if (this.lassoing) {
      this.previewContext.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      this.path.closePath();
      this.displayContext.fill(this.path);
      this.previewContext.save();
      if (this.model.get('erasing')) {
        this.previewContext.fillStyle = 'rgba(255,255,255,1)';
      } else {
        this.previewContext.fillStyle = 'rgb(255, 10, 100)';
      }
      this.previewContext.fill(this.path);
      this.model.classContext.drawImage(
        this.previewCanvas,
        0,
        0,
        this.previewCanvas.width,
        this.previewCanvas.height,
        this._Sx,
        this._Sy,
        this._sWidth,
        this._sHeight
      );
      this.previewContext.restore();
      this.drawImageScaled();
      this.lassoing = false;
      this.previewContext.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      // sync the data after all the drawing to keep drawing as snappy as possible
      const h = this.model.classCanvas.height;
      const w = this.model.classCanvas.width;
      const imgData = this.model.classContext.getImageData(0, 0, w, h);
      const nd = ndarray(imgData.data, [w, h, 4]);
      this.model.set('data', nd);
      this.model.save_changes();
    }
    this.panning = false;
  };

  private _mouseMove = (e: MouseEvent): void => {
    if (this.lassoing) {
      this.previewContext.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      const [mouseX, mouseY] = this.canvasCoords(e);
      this.path.lineTo(mouseX, mouseY);
      const closedPath = new Path2D(this.path);
      closedPath.closePath();
      this.previewContext.fill(closedPath);
      this.previewContext.setLineDash([15, 5]);
      this.previewContext.stroke(this.path);
    } else if (this.panning) {
      const [x, y] = this.canvasCoords(e);
      this._Sx = this._panStartX - (x * this.intrinsicZoom) / this.userZoom;
      this._Sy = this._panStartY - (y * this.intrinsicZoom) / this.userZoom;
      this.drawImageScaled();
    }
  };
  private drawImageScaled(): void {
    // at some point should consider: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
    // to not always scale the image. But maybe not necessary, I still seem to get 60 fps
    // according to the firefox devtools performance thing
    this.displayContext.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
    this.displayContext.drawImage(
      this.model.imgCanvas,
      this._Sx, // sx
      this._Sy, // sy
      this._sWidth,
      this._sHeight,
      0, // dx
      0, // dy
      this.displayCanvas.width,
      this.displayCanvas.height
    );
    this.displayContext.globalAlpha = 0.4;

    this.displayContext.drawImage(
      this.model.classCanvas,
      this._Sx, // sx
      this._Sy, // sy
      this._sWidth,
      this._sHeight,
      0, // dx
      0, // dy
      this.displayCanvas.width,
      this.displayCanvas.height
    );
    this.displayContext.globalAlpha = 1;
  }
  private _wheel = (e: MouseWheelEvent): void => {
    let scale = 1;
    if (e.deltaY < 0) {
      scale = 1.1;
    } else if (e.deltaY > 0) {
      scale = 1 / 1.1;
    }
    const [x, y] = this.canvasCoords(e);
    const left = (x * this.intrinsicZoom) / this.userZoom;
    const down = (y * this.intrinsicZoom) / this.userZoom;
    const X = this._Sx + left;
    const Y = this._Sy + down;
    this.userZoom *= scale;
    this._sWidth /= scale;
    this._sHeight /= scale;
    const newLeft = left / scale;
    const newDown = down / scale;
    this._Sx = X - newLeft;
    this._Sy = Y - newDown;

    // currently this is somewhat jerky if you have also panned to outside the image bounds
    // not sure how to easily fix that - but doesn't seem that crucial

    if (this._sWidth > this.model.classCanvas.width) {
      this._Sx = (this.model.classCanvas.width - this._sWidth) / 2;
      this.displayContext.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
    }
    if (this._sHeight > this.model.classCanvas.height) {
      this._Sy = (this.model.classCanvas.height - this._sHeight) / 2;
      this.displayContext.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
    }
    this.drawImageScaled();
    e.preventDefault();
  };
  redraw() {
    this.drawImageScaled();
    console.log('beep boop!');
  }
  model: segmentModel;
  displayCanvas: HTMLCanvasElement;
  previewCanvas: HTMLCanvasElement;
  displayContext: CanvasRenderingContext2D;
  previewContext: CanvasRenderingContext2D;
  private lassoing: boolean;
  private panning: boolean;
  private path: Path2D;
  private userZoom = 1;
  private intrinsicZoom = 1;
  private _Sx = 0;
  private _Sy = 0;
  private _sWidth = 0;
  private _sHeight = 0;
  private _panStartX = 0;
  private _panStartY = 0;
  private displayWidth = 500;
  private displayHeight = 500;
}

// taken from ipycanvas
function getContext(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (context === null) {
    throw 'Could not create 2d context.';
  }
  return context;
}
