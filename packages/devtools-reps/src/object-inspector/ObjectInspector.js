/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
const {
  Component,
  createFactory,
  DOM: dom,
  PropTypes,
} = require("react");
const { connect } = require("react-redux");
const { bindActionCreators } = require("redux");

import Components from "devtools-components";
const Tree = createFactory(Components.Tree);
require("./index.css");

const classnames = require("classnames");

const {
  REPS: {
    Rep,
    Grip,
  },
} = require("../reps/rep");
const {
  MODE,
} = require("../reps/constants");

const {
  getChildren,
  getParent,
  getValue,
  nodeHasAccessors,
  nodeHasProperties,
  nodeIsDefaultProperties,
  nodeIsFunction,
  nodeIsGetter,
  nodeIsMapEntry,
  nodeIsMissingArguments,
  nodeIsOptimizedOut,
  nodeIsPrimitive,
  nodeIsPrototype,
  nodeIsSetter,
  nodeIsWindow,
} = require("./utils/node");

import type {
  CachedNodes,
  LoadedProperties,
  GripProperties,
  Node,
  NodeContents,
  ObjectClient,
  RdpGrip,
} from "./types";

type Mode = MODE.TINY | MODE.SHORT | MODE.LONG;

type Props = {
  autoExpandAll: boolean,
  autoExpandDepth: number,
  disabledFocus: boolean,
  itemHeight: number,
  inline: boolean,
  mode: Mode,
  roots: Array<Node>,
  disableWrap: boolean,
  dimTopLevelWindow: boolean,
  releaseActor: string => void,
  createObjectClient: RdpGrip => ObjectClient,
  onFocus: ?(Node) => any,
  onDoubleClick: ?(
    item: Node,
    options: {
      depth: number,
      focused: boolean,
      expanded: boolean
    }
  ) => any,
  onLabelClick: ?(
    item: Node,
    options: {
      depth: number,
      focused: boolean,
      expanded: boolean,
      setExpanded: (Node, boolean) => any,
    }
  ) => any,
  actors: Set<string>,
  expandedPaths: Set<string>,
  focusedItem: ?Node,
  loadedProperties: LoadedProperties,
  loading: Map<string, Array<Promise<GripProperties>>>,
};

type DefaultProps = {
  autoExpandAll: boolean,
  autoExpandDepth: number,
};

// This implements a component that renders an interactive inspector
// for looking at JavaScript objects. It expects descriptions of
// objects from the protocol, and will dynamically fetch child
// properties as objects are expanded.
//
// If you want to inspect a single object, pass the name and the
// protocol descriptor of it:
//
//  ObjectInspector({
//    name: "foo",
//    desc: { writable: true, ..., { value: { actor: "1", ... }}},
//    ...
//  })
//
// If you want multiple top-level objects (like scopes), you can pass
// an array of manually constructed nodes as `roots`:
//
//  ObjectInspector({
//    roots: [{ name: ... }, ...],
//    ...
//  });

// There are 3 types of nodes: a simple node with a children array, an
// object that has properties that should be children when they are
// fetched, and a primitive value that should be displayed with no
// children.

class ObjectInspector extends Component {
  static defaultProps: DefaultProps;
  constructor(props: Props) {
    super();
    this.cachedNodes = new Map();

    const self: any = this;

    self.getChildren = this.getChildren.bind(this);
    self.renderTreeItem = this.renderTreeItem.bind(this);
    self.setExpanded = this.setExpanded.bind(this);
    self.focusItem = this.focusItem.bind(this);
    self.getRoots = this.getRoots.bind(this);
  }

  shouldComponentUpdate(nextProps: Props) {
    console.log("shouldComponentUpdate", nextProps);
    const {
      expandedPaths,
      loadedProperties
    } = this.props;

    return expandedPaths.size !== nextProps.expandedPaths.size
      || loadedProperties.size !== nextProps.loadedProperties.size
      || [...expandedPaths].some(key => !nextProps.expandedPaths.has(key));
  }

  props: Props;
  cachedNodes: CachedNodes;

  getChildren(item: Node) : Array<Node> | NodeContents | null {
    const {
      loadedProperties
    } = this.props;
    const { cachedNodes } = this;

    return getChildren({
      loadedProperties,
      cachedNodes,
      item
    });
  }

  getRoots(): Array<Node> {
    return this.props.roots;
  }

  getKey(item: Node) : string {
    return item.path;
  }

  /**
   * This function is responsible for expanding/collapsing a given node,
   * which also means that it will check if we need to fetch properties,
   * entries, prototype and symbols for the said node. If we do, it will call
   * the appropriate ObjectClient functions, and change the state of the component
   * with the results it gets from those functions.
   */
  async setExpanded(item: Node, expand: boolean) {
    if (nodeIsPrimitive(item)) {
      return;
    }

    const {
      createObjectClient,
      loadedProperties,
    } = this.props;

    const key = this.getKey(item);

    if (expand === true) {
      this.props.nodeExpand(item);
      this.props.nodeLoadProperties(item, loadedProperties, createObjectClient);
    } else {
      this.props.nodeCollapse(item);
    }
  }

  focusItem(item: Node) {
    if (this.props.focusedItem !== item) {
      this.props.nodeFocus(item);
    }
  }

  renderTreeItem(
    item: Node,
    depth: number,
    focused: boolean,
    arrow: Object,
    expanded: boolean
  ) {
    let objectValue;
    let label = item.name;
    let itemValue = getValue(item);

    const isPrimitive = nodeIsPrimitive(item);

    const unavailable =
      isPrimitive &&
      itemValue &&
      itemValue.hasOwnProperty &&
      itemValue.hasOwnProperty("unavailable");

    if (nodeIsOptimizedOut(item)) {
      objectValue = dom.span({ className: "unavailable" }, "(optimized away)");
    } else if (nodeIsMissingArguments(item) || unavailable) {
      objectValue = dom.span({ className: "unavailable" }, "(unavailable)");
    } else if (
      nodeIsFunction(item)
      && !nodeIsGetter(item)
      && !nodeIsSetter(item)
      && (
        this.props.mode === MODE.TINY
        || !this.props.mode
      )
    ) {
      objectValue = undefined;
      label = this.renderGrip(
        item,
        Object.assign({}, this.props, {
          functionName: label
        })
      );
    } else if (
      nodeHasProperties(item)
      || nodeHasAccessors(item)
      || nodeIsMapEntry(item)
      || isPrimitive
    ) {
      let repsProp = Object.assign({}, this.props);
      if (depth > 0) {
        repsProp.mode = this.props.mode === MODE.LONG
          ? MODE.SHORT
          : MODE.TINY;
      }
      if (expanded) {
        repsProp.mode = MODE.TINY;
      }

      objectValue = this.renderGrip(item, repsProp);
    }

    const hasLabel = label !== null && typeof label !== "undefined";
    const hasValue = typeof objectValue !== "undefined";

    const {
      onDoubleClick,
      onLabelClick,
      dimTopLevelWindow,
    } = this.props;

    return dom.div(
      {
        className: classnames("node object-node", {
          focused,
          lessen: !expanded && (
            nodeIsDefaultProperties(item)
            || nodeIsPrototype(item)
            || (
                dimTopLevelWindow === true
                && nodeIsWindow(item)
                && depth === 0
              )
          )
        }),
        onClick: e => {
          e.stopPropagation();
          if (isPrimitive === false) {
            this.setExpanded(item, !expanded);
          }
        },
        onDoubleClick: onDoubleClick
          ? e => {
            e.stopPropagation();
            onDoubleClick(item, {
              depth,
              focused,
              expanded
            });
          }
          : null
      },
      arrow,
      hasLabel
        ? dom.span(
          {
            className: "object-label",
            onClick: onLabelClick
              ? event => {
                event.stopPropagation();
                onLabelClick(item, {
                  depth,
                  focused,
                  expanded,
                  setExpanded: this.setExpanded
                });
              }
              : null
          },
          label
        )
        : null,
      hasLabel && hasValue
        ? dom.span({ className: "object-delimiter" }, ": ")
        : null,
      hasValue
        ? objectValue
        : null
    );
  }

  renderGrip(
    item: Node,
    props: Props
  ) {
    const object = getValue(item);
    return Rep(Object.assign({}, props, {
      object,
      mode: props.mode || MODE.TINY,
      defaultRep: Grip,
    }));
  }

  render() {
    const {
      autoExpandDepth = 1,
      autoExpandAll = true,
      disabledFocus,
      inline,
      itemHeight = 20,
      disableWrap = false,
    } = this.props;

    const {
      expandedPaths,
      focusedItem,
    } = this.props;

    let roots = this.getRoots();
    if (roots.length === 1) {
      const root = roots[0];
      const name = root && root.name;
      if (nodeIsPrimitive(root) && (name === null || typeof name === "undefined")) {
        return this.renderGrip(root, this.props);
      }
    }

    return Tree({
      className: classnames({
        inline,
        nowrap: disableWrap,
        "object-inspector": true,
      }),
      autoExpandAll,
      autoExpandDepth,
      disabledFocus,
      itemHeight,

      isExpanded: item => expandedPaths.has(this.getKey(item)),
      isExpandable: item => nodeIsPrimitive(item) === false,
      focused: focusedItem,

      getRoots: this.getRoots,
      getParent,
      getChildren: this.getChildren,
      getKey: this.getKey,

      onExpand: item => this.setExpanded(item, true),
      onCollapse: item => this.setExpanded(item, false),
      onFocus: this.focusItem,

      renderItem: this.renderTreeItem
    });
  }
}

ObjectInspector.displayName = "ObjectInspector";

function mapStateToProps(state, props) {
  console.log("mapStateToProps", {state, props})

  return {
    actors: state.actors,
    expandedPaths: state.expandedPaths,
    focusedItem: state.focusedItem,
    loadedProperties: state.loadedProperties,
    loading: state.loading,
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(require("./actions"), dispatch);
}

const ConnectedObjectInspector =
  connect(mapStateToProps, mapDispatchToProps)(ObjectInspector);

module.exports = createFactory(ConnectedObjectInspector);
