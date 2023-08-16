
let xist = {};
xist.tree = (function () {
  let _count = 0;
  let tree = function (options, data) {
    this._id = "tree-" + _count++;
    this._root = mkr.default(options.root, null);
    this._dir = mkr.default(options.dir, xist.tree.TOP_DOWN); //topDown, bottomUp, leftRight, rightLeft
    this._grid = mkr.default(options.grid, null);
    options.view = mkr.default(options.view, {});
    this._nodeW = mkr.default(options.nodeW, 250);
    this._nodeH = mkr.default(options.nodeH, 65);
    this._gap = mkr.default(options.gap, 40);
    this._parent = mkr.default(options.parent, document.body);
    this._data = mkr.default(data, null);
    this._width = this._height = 0;
    this._resized = new signals.Signal();

    TweenMax.set(mkr.getRule(".node"), {
      cssRule: { width: this.nodeW, height: this.nodeH },
    });
    TweenMax.set(mkr.getRule(".node .thumb"), {
      cssRule: { width: this.nodeH, height: this.nodeH },
    });

    mkr.setDefault(options.view, "attr", {});
    mkr.setDefault(options.view.attr, "class", "tree");
    mkr.setDefault(options.view.attr, "id", this.id);
    mkr.setDefault(options.view, "css", {});
    mkr.setDefault(options.view.css, "width", "100%");
    mkr.setDefault(options.view.css, "height", "100%");
    mkr.setDefault(options.view.css, "background", "#dddddd");

    this._view =
      mkr.query("#" + options.view.attr.id) ||
      mkr.create("div", options.view, this._parent);
    this._svg =
      mkr.query("#" + options.view.attr.id, this.view) ||
      mkr.create(
        "svg",
        {
          attr: { class: "lines" },
          css: {
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            overflow: "visible",
          },
        },
        this.view
      );

    Draggable.create(this.view, { type: "x,y", zIndexBoost: false });

    this.update();
  };

  tree.prototype = {
    get id() {
      return this._id;
    },
    get dir() {
      return this._dir;
    },
    set dir(value) {
      this._dir = value;
      this.refresh();
    },
    get grid() {
      return this._grid;
    },
    get data() {
      return this._data;
    },
    set data(value) {
      this._data = value;
      this.update();
    },
    get view() {
      return this._view;
    },
    get svg() {
      return this._svg;
    },
    get nodeW() {
      return this._nodeW;
    },
    get nodeH() {
      return this._nodeH;
    },
    get gap() {
      return this._gap;
    },
    get count() {
      return this._count;
    },
    get root() {
      return this._root;
    },
    get pairs() {
      return this._pairs;
    },
    get gridW() {
      return this._gridW;
    },
    get gridH() {
      return this._gridH;
    },
    get width() {
      return this._width;
    },
    get height() {
      return this._height;
    },
    get depth() {
      return xist.node.instances[this.root].depth;
    },
    get breadth() {
      return xist.node.instances[this.root].breadth;
    },
    get resized() {
      return this._resized;
    },
    get x() {
      return xist.node.instances[this.root].x;
    },
    set x(value) {
      let root = xist.node.instances[this.root];
      root.x = root._originX = value;
      root.refresh();
    },
    get y() {
      return xist.node.instances[this.root].y;
    },
    set y(value) {
      let root = xist.node.instances[this.root];
      root.y = root._originY = value;
      root.refresh();
    },

    setXY: function (x, y) {
      let root = xist.node.instances[this.root];
      root.x = root._originX = x;
      root.y = root._originY = y;
      root.setOrigin(root.x, root.y);
      root.refresh();
    },

    create: function (options, data) {
      options = options || {};
      options.tree = this;
      let node = new xist.node(options, data);
      return node;
    },

    add: function (node) {
      if (node.tree) {
        if (node.tree === this) return;
        node.tree.remove(node.id);
      }
      node.tree = this;
      if (!this._root) this._root = node.id;
    },

    remove: function (id) {
      if (this.root == id) this._root = null;
    },
    delete: function (id) {
      let node = xist.node.instances[id];
      node.destroy();
    },

    refresh: function () {
      if (!this.root) return;

      let root = xist.node.instances[this.root];
      //run DFS to find/assign breadths of all subtrees
      root.findBreadth(this);

      //run DFS to find/assign depths of all subtrees
      root.findDepth();

      //run BFS to set offsets
      root.refresh();

      let w, h;
      switch (this.dir) {
        default:
        case xist.tree.TOP_DOWN:
        case xist.tree.BOTTOM_UP:
          w = root.breadth * this.nodeW + (root.breadth - 1) * this.gap;
          h = (root.depth + 1) * this.nodeH + root.depth * this.gap;
          break;

        case xist.tree.LEFT_RIGHT:
        case xist.tree.RIGHT_LEFT:
          w = (root.depth + 1) * this.nodeW + root.depth * this.gap;
          h = root.breadth * this.nodeH + (root.breadth - 1) * this.gap;
          break;
      }
      let resized = false;
      if (this._width != w) {
        this._width = w;
        resized = true;
      }
      if (this._height != h) {
        this._height = h;
        resized = true;
      }
      if (resized) this.resized.dispatch();
    },

    clear: function () {
      if (this.root) {
        this.root.destroy();
        this.root = null;
      }
    },

    update: function () {
      if (this.root) xist.node.instances[this.root].data = this.data;
      else this.data;
      this.create({}, this.data);
    },
  };

  tree.TOP_DOWN = 0;
  tree.BOTTOM_UP = 1;
  tree.LEFT_RIGHT = 2;
  tree.RIGHT_LEFT = 3;
  return tree;
})();

//node class
xist.node = (function () {
  let node = function (options, data) {
    this._id = uuid.v1();
    xist.node.instances[this._id] = this;
    let tree = options.tree;
    this._parent = mkr.default(options.parent, null);
    this._children = mkr.default(options.children, []) || [];
    this._lines;
    this._depth = 0;
    this._breadth = 1;
    this._target = null;
    this._originX = this._originY = 0;

    tree.add(this);

    //data setup
    this.data = mkr.default(data, {});

    mkr.setDefault(options, "x", 0);
    mkr.setDefault(options, "y", 0);
    //this.createView(options.x, options.y);

    //drag/drop functionality
    let self = this;
  };

  node.prototype = {
    get id() {
      return this._id;
    },
    get isRoot() {
      return this.id === this.tree.root;
    },
    get tree() {
      return this._tree;
    },
    set tree(value) {
      let n = this.children.length;
      this._tree = value;
      for (let i = 0; i < n; i++) {
        this.childAt(i).tree = value;
      }
    },
    get lines() {
      return this._lines;
    },
    get data() {
      return this._data;
    },
    set data(value) {
      let children;
      if (value && "children" in value) {
        children = value.children.concat();
        delete value.children;
      }
      this._data = mkr.default(value, {}) || {};
      mkr.setDefault(this._data, "name", "");
      mkr.setDefault(this._data, "dob", ""); //date of birth
      mkr.setDefault(this._data, "pob", ""); //place of birth
      mkr.setDefault(this._data, "dod", ""); //date of death
      mkr.setDefault(this._data, "pod", ""); //place of death
      mkr.setDefault(this._data, "url", ""); //thumbnail url
      this._url = mkr.default(this._data.url, "");
      this.view ? this.update() : this.createView();

      this.children = children;
    },
    get children() {
      return this._children;
    },
    set children(value) {
      if (this.children.length) {
        this.destroyChildren();
      }
      let len = value ? value.length : 0,
        node;
      for (let i = 0; i < len; i++) {
        node = this.tree.create({}, value[i]);
        this.addChild(node);
      }
    },
    get parent() {
      return this._parent;
    },
    set parent(value) {
      this._parent = value;
    },
    get dragger() {
      return this._dragger;
    },
    get view() {
      return this._view;
    },
    get x() {
      return this.view._gsTransform.x;
    },
    set x(value) {
      TweenMax.set(this.view, { x: value });
      //this.refresh();
    },
    get y() {
      return this.view._gsTransform.y;
    },
    set y(value) {
      TweenMax.set(this.view, { y: value });
      //this.refresh();
    },
    get right() {
      return this.view._gsTransform.x + this.tree.nodeW;
    },
    get bottom() {
      return this.view._gsTransform.y + this.tree.nodeH;
    },
    get originX() {
      return this._originX;
    },
    set originX(value) {
      this.tree.grid.remove(this.view);
      this._originX = this.view.minX = value;
      this.view.maxX = this.originR;
      this.tree.grid.insert(this.view);
    },
    get originY() {
      return this._originY;
    },
    set originY(value) {
      this.tree.grid.remove(this.view);
      this._originY = this.view.minY = value;
      this.view.maxY = this.originB;
      this.tree.grid.insert(this.view);
    },
    get originR() {
      return this._originX + this.tree.nodeW;
    },
    get originB() {
      return this._originY + this.tree.nodeH;
    },

    get breadth() {
      return this._breadth;
    },
    get depth() {
      return this._depth;
    },

    setOrigin: function (x, y) {
      this.tree.grid.remove(this.view);
      this._originX = this.view.minX = x;
      this._originY = this.view.minY = y;
      this.view.maxX = this.originR;
      this.view.maxY = this.originB;
      this.tree.grid.insert(this.view);
    },

    createView: function (x, y) {
      x = mkr.default(x, 0);
      y = mkr.default(y, 0);
      this._view = mkr.create(
        "div",
        {
          css: { x: x, y: y },
          attr: { id: this.id, class: "node" },
          text: `<div ></div>
              <div class='details'>
              <a class='name text-center h4' href="${this._url}"></a>
              </div>`,
              
        },
        this.tree.view
      );
      this.view.minX = x;
      this.view.minY = y;
      this.view.maxX = x + this.tree.nodeW;
      this.view.maxY = x + this.tree.nodeH;
      this.view._tree = this.tree.id;

      this._lines = [
        mkr.construct(
          "ln",
          { attr: { class: "ln-0", x1: 0, x2: 0, y1: 0, y2: 0 } },
          "#" + this.tree.view.id + " .lines"
        ),
        mkr.construct(
          "ln",
          { attr: { class: "ln-1", x1: 0, x2: 0, y1: 0, y2: 0 } },
          "#" + this.tree.view.id + " .lines"
        ),
        mkr.construct(
          "ln",
          { attr: { class: "ln-2", x1: 0, x2: 0, y1: 0, y2: 0 } },
          "#" + this.tree.view.id + " .lines"
        ),
      ];

      if (this.isRoot) this.tree.refresh();
      this.update();
    },

    snap: function () {
      //console.log(this);
      TweenMax.to(this, 0.25, {
        x: this._originX,
        y: this._originY,
        onUpdate: this.refresh,
        onUpdateScope: this,
      });
    },

    addChild: function (node) {
      let id = node.id;
      if (node.parent) {
        xist.node.instances[node.parent].removeChild(id);
      }
      this.tree.add(node);
      this.children.push(id);
      node.parent = this.id;
      this.tree.refresh();
    },

    addChildren: function (ids) {
      for (let id of ids) {
        this.addChild(id);
      }
    },
    removeChild: function (id) {
      let n = this.children.indexOf(id);
      if (n >= 0) {
        this.children.splice(n, 1);
        xist.node.instances[id].parent = null;
        this.tree.refresh();
      }
    },
    childAt: function (n) {
      if (n < 0) n += this.children.length;
      return xist.node.instances[this.children[n]];
    },
    clearChildren: function () {
      for (let id of this.children) {
        xist.node.instances[id].parent = null;
      }
      this.children = [];
    },
    destroyChildren: function () {
      for (let id of this.children) {
        xist.node.instances[id].destroy();
      }
      this.children = [];
    },

    destroy: function () {
      if (this.parent) {
        //remove from parent
        xist.node.instances[this.parent].removeChild(this.id);
        this.parent = null;
      }
      this.destroyChildren(); //destroy all children
      if (this.dragger) this.dragger.kill();
      mkr.remove(this.view);
      mkr.remove([this.lines[0].el, this.lines[1].el, this.lines[2].el]);
      this.tree.remove(this.id);
      delete xist.node.instances[this.id];
    },

    //DFS algorithm that determines the total breadth of each subtree
    findBreadth: function (tree) {
      let n = this.children.length;
      if (n == 0) {
        this._breadth = 1;
        return this._breadth;
      }

      let node,
        breadth = 0;
      for (let i = 0; i < n; i++) {
        node = this.childAt(i);
        breadth += node.findBreadth(tree);
      }
      this._breadth = breadth;
      return breadth;
    },

    //DFS algorithm that determines the max depth of each subtree
    findDepth: function (level) {
      level = mkr.default(level, 0);
      let n = this.children.length,
        depth,
        max = 0;
      if (n > 0) {
        depth = 1;
        for (let i = 0; i < n; i++) {
          max = Math.max(max, this.childAt(i).findDepth(level + 1));
        }
      } else {
        depth = 0;
      }
      this._depth = depth + max;
      return this._depth;
    },

    //BFS algorithm that handles node placement
    refresh: function () {
      let n = this.children.length;
      let node,
        total,
        startX,
        startY,
        delta,
        subTotal,
        step = 0,
        gap = this.tree.gap,
        nodeW = this.tree.nodeW,
        nodeH = this.tree.nodeH;
      let x1;
      switch (this.tree.dir) {
        default:
        case xist.tree.TOP_DOWN:
          //calculate total width of the subtree based on the breadth prop
          total = this.breadth * nodeW + (this.breadth - 1) * gap;
          startX = this.x + (nodeW - total) / 2;
          startY = this.y + nodeH + gap;
          delta = nodeW + gap;

          for (let i = 0; i < n; i++) {
            node = xist.node.instances[this.children[i]];
            subTotal = node.breadth * nodeW + (node.breadth - 1) * gap;
            node.x = startX + step + (subTotal - nodeW) / 2;
            node.y = startY;
            node.setOrigin(node.x, node.y);

            step += subTotal + gap;
            node.refresh();
          }

          //update lines, line to parent
          TweenMax.set(this.lines[0], {
            x1: this.x + nodeW / 2,
            x2: this.x + nodeW / 2,
            y1: this.y - gap / 2,
            y2: this.y,
          });
          //perpendicular child line
          TweenMax.set(this.lines[1], {
            x1: this.x + nodeW / 2,
            x2: this.x + nodeW / 2,
            y1: this.y + nodeH,
            y2: this.y + nodeH + gap / 2,
          });
          //parallel child line
          if (this.children.length) {
            TweenMax.set(this.lines[2], {
              x1: this.childAt(0).x + nodeW / 2,
              x2: this.childAt(-1).x + nodeW / 2,
              y1: this.y + nodeH + gap / 2,
              y2: this.y + nodeH + gap / 2,
            });
          }
          break;
        case xist.tree.BOTTOM_UP:
          //calculate total width of the subtree based on the breadth prop
          total = this.breadth * nodeW + (this.breadth - 1) * gap;
          startX = this.x + (nodeW - total) / 2;
          startY = this.y - nodeH - gap;
          delta = nodeW + gap;

          for (let i = 0; i < n; i++) {
            node = xist.node.instances[this.children[i]];
            subTotal = node.breadth * nodeW + (node.breadth - 1) * gap;
            node.x = startX + step + (subTotal - nodeW) / 2;
            node.y = startY;
            node.setOrigin(node.x, node.y);

            step += subTotal + gap;
            node.refresh();
          }

          //update lines, line to parent
          TweenMax.set(this.lines[0], {
            x1: this.x + nodeW / 2,
            x2: this.x + nodeW / 2,
            y1: this.y + nodeH + gap / 2,
            y2: this.y + nodeH,
          });
          //perpendicular child line
          TweenMax.set(this.lines[1], {
            x1: this.x + nodeW / 2,
            x2: this.x + nodeW / 2,
            y1: this.y,
            y2: this.y - gap / 2,
          });
          //parallel child line
          if (this.children.length) {
            TweenMax.set(this.lines[2], {
              x1: this.childAt(0).x + nodeW / 2,
              x2: this.childAt(-1).x + nodeW / 2,
              y1: this.y - gap / 2,
              y2: this.y - gap / 2,
            });
          }
          break;
        case xist.tree.LEFT_RIGHT:
          //calculate total height of the subtree based on the breadth prop
          total = this.breadth * nodeH + (this.breadth - 1) * gap;
          startX = this.x + nodeW + gap;
          startY = this.y + (nodeH - total) / 2;
          delta = nodeH + gap;

          for (let i = 0; i < n; i++) {
            node = xist.node.instances[this.children[i]];
            subTotal = node.breadth * nodeH + (node.breadth - 1) * gap;
            node.x = startX;
            node.y = startY + step + (subTotal - nodeH) / 2;
            node.setOrigin(node.x, node.y);

            step += subTotal + gap;
            node.refresh();
          }

          //update lines, line to parent
          TweenMax.set(this.lines[0], {
            x1: this.x - gap / 2,
            x2: this.x,
            y1: this.y + nodeH / 2,
            y2: this.y + nodeH / 2,
          });
          //perpendicular child line
          TweenMax.set(this.lines[1], {
            x1: this.x + nodeW,
            x2: this.x + nodeW + gap / 2,
            y1: this.y + nodeH / 2,
            y2: this.y + nodeH / 2,
          });
          //parallel child line
          if (this.children.length) {
            TweenMax.set(this.lines[2], {
              x1: this.x + nodeW + gap / 2,
              x2: this.x + nodeW + gap / 2,
              y1: this.childAt(0).y + nodeH / 2,
              y2: this.childAt(-1).y + nodeH / 2,
            });
          }
          break;
        case xist.tree.RIGHT_LEFT:
          //calculate total height of the subtree based on the breadth prop
          total = this.breadth * nodeH + (this.breadth - 1) * gap;
          startX = this.x - (nodeW + gap);
          startY = this.y + (nodeH - total) / 2;
          delta = nodeH + gap;

          for (let i = 0; i < n; i++) {
            node = xist.node.instances[this.children[i]];
            subTotal = node.breadth * nodeH + (node.breadth - 1) * gap;
            node.x = startX;
            node.y = startY + step + (subTotal - nodeH) / 2;
            node.setOrigin(node.x, node.y);

            step += subTotal + gap;
            node.refresh();
          }

          //update lines, line to parent
          TweenMax.set(this.lines[0], {
            x1: this.x + nodeW + gap / 2,
            x2: this.x + nodeW,
            y1: this.y + nodeH / 2,
            y2: this.y + nodeH / 2,
          });
          //perpendicular child line
          TweenMax.set(this.lines[1], {
            x1: this.x,
            x2: this.x - gap / 2,
            y1: this.y + nodeH / 2,
            y2: this.y + nodeH / 2,
          });
          //parallel child line
          if (this.children.length) {
            TweenMax.set(this.lines[2], {
              x1: this.x - gap / 2,
              x2: this.x - gap / 2,
              y1: this.childAt(0).y + nodeH / 2,
              y2: this.childAt(-1).y + nodeH / 2,
            });
          }
          break;
      }
      //update line visibility
      TweenMax.set(this.lines[0].el, { autoAlpha: this.parent ? 1 : 0 });
      TweenMax.set([this.lines[1].el, this.lines[2].el], {
        autoAlpha: this.children.length ? 1 : 0,
      });
    },

    //update node based on data
    update: function () {
      // TweenMax.set(mkr.query(".thumb img", this.view), {
      //   attr: { src: this.data.thumb },
      // });
      TweenMax.set(mkr.query(".name", this.view), { text: this.data.name });
    },
  };

  node.instances = {};
  node.getInstance = function (id) {
    return node.instances[id];
  };

  node.box = {};
  node.setBox = function (minX, maxX, minY, maxY) {
    node.box.minX = minX;
    node.box.maxX = maxX;
    node.box.minY = minY;
    node.box.maxY = maxY;
  };
  return node;
})();

//immediate family tree
xist.iTree = (function () {
  let iTree = function (data, options) {
    //default data
    data = data || [];
    data[0] = mkr.default(data[0], { name: "You" });
    // data[1] = mkr.default(data[1], { name: "Mom" });
    // data[2] = mkr.default(data[2], { name: "Dad" });

    //default options
    options = options || {};
    this._parent = mkr.default(options.parent, document.body);
    this._zoom = mkr.default(options.zoom, 1);

    //create shared dom elements
    let m = new mkr({
      attr: { id: "tree-container" },
      css: {
        width: "100%",
        height: "100%",
        background: "transparent",
        overflow: "hidden",
      },
    });
    m.create("div", { attr: { id: "trees", class: "tree" } });
    m.create(
      "div",
      {
        attr: { id: "trees-bg" },
        css: {padding: "25px", x: -25, y: -25 },
      },
      "#trees"
    );

    //create shared spatial grid
    this._grid = rbush(10);

    //root tree
    this.root = new xist.tree(
      {
        dir: xist.tree.TOP_DOWN,
        view: { attr: { id: "trees" } },
        grid: this._grid,
      },
      data[0]
    );


    this.onTreeResize();
    this.centerOnRoot();

    this._grid.clear();
    this._grid.load(Array.prototype.slice.call(mkr.queryAll("#trees .node")));

    // this.mom.resized.add(this.onTreeResize, this);
    // this.dad.resized.add(this.onTreeResize, this);
    this.root.resized.add(this.onTreeResize, this);

    mkr.on(
      "#tree-container",
      "wheel",
      function (e) {
        this.zoom -= e.deltaY / 1000;
      },
      this
    );

    mkr.on(
      "#addNode",
      "click",
      function () {
        this.root.create();
      },
      this
    );
  };

  iTree.prototype = {
    get zoom() {
      return this._zoom;
    },
    set zoom(value) {
      this._zoom = Math.min(2, Math.max(0.25, value));
      TweenMax.to("#trees", 0.2, { scale: this._zoom });
    },

    set data(value) {
      let data = value || [];
      data[0] = mkr.default(data[0], { name: "You" });
      // data[1] = mkr.default(data[1], { name: "Mom" });
      // data[2] = mkr.default(data[2], { name: "Dad" });

      this.root.data = data[0];
      // this.mom.data = data[1];
      // this.dad.data = data[2];

      this.centerOnRoot();
    },

    clear: function () {
      this.data = null;
    },

    onTreeResize: function () {
      //position trees based on dimensions
      let momX = 0,
        momY = 0,
        dadX = 330,
        dadY = 0,
        rootX,
        rootY;
      // momX = this.mom.width - this.mom.nodeW;
      // dadX = momX + this.root.nodeW + 2 * this.root.gap;

      // let maxH = Math.max(this.dad.height, this.mom.height);
      let maxH = Math.max(65, 65);
      momY = dadY = maxH / 2 - this.root.nodeH / 2;
      rootX =
        momX +
        (250 +
          250 +
          2 * this.root.gap -
          this.root.nodeW) /
          2;
      rootY = momY + this.root.nodeH + 2 * this.root.gap;


      this.root.setXY(rootX, rootY);


      let w = (this._width =
        250 + 250 + 2 * this.root.gap);
      // let w = (this._width =
      //   this.mom.width + this.dad.width + 2 * this.root.gap);
      let h = (this._height = maxH);
      if (momY + maxH / 2 < rootY + this.root.height) {
        h = rootY + this.root.height;
      }
      TweenMax.set("#trees", { width: w, height: h });
      TweenMax.set("#trees-bg", { width: w + 50, height: h + 50 });
    },

    centerOnRoot: function () {
      TweenMax.set("#trees", {
        x: (mkr.query("#tree-container").offsetWidth - this._width) / 2,
        y: (mkr.query("#tree-container").offsetHeight - this._height) / 10,
      });
    },
  };

  return iTree;
})();

let data = [
  {
    name: "wwwwwwwwwww",
    url: "https://reurl.cc/N07y6x",
    children: [
      {
        name: "Setting up your Environment",
        url:"Ch2.html",
        children: [
          {
            name: "Basic Operations",
            children: [
              { name: "Arthmetic Operators" },
              { name: "Logical Operators" },
            ],
          },
          {
            name: "Functions",
            children: [{ name: "Operators" }, { name: "Lambda" }],
          },
        ],
      },
      {
        name: "Data Types",
        children: [
          {
            name: "Pointers and References",
            children: [{ name: "Refrences" }, { name: "Memory Model" }],
          },
          {
            name: "Structuring Codebase",
            children: [{ name: "Code Splitting: Headers / CPP Files" }, { name: "Scope" }],
          },
        ],
      },
    ],
  },

  
];

let tree = new xist.iTree(data);
