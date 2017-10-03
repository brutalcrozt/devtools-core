/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
const { createElement } = require("react");
const { Provider } = require("react-redux");
const { applyMiddleware, createStore } = require("redux");
const {thunk} = require("../shared/redux/middleware/thunk");
const ObjectInspector = require("./ObjectInspector");
const createReducer = require("./reducer");

// function clearState(
//   id?: String,
//   {
//     releaseActor
//   }
// ) {
//   if (!id) {
//     Object.keys(store).forEach(clearState);
//     store = {};
//     return;
//   }

//   const data = store[id];
//   if (!data) {
//     return;
//   }

//   if (typeof releaseActor === "function") {
//     const {actors} = data;
//     for (let actor of actors) {
//       releaseActor(actor);
//     }
//   }

//   store = Object.entries(store).reduce((obj, [treeId, treeState]) => {
//     if (treeId !== id) {
//       obj[treeId] = treeState;
//     }
//     return obj;
//   }, {});
// }

const states = new Map();

type Props = {
  autoExpandAll: boolean,
  autoExpandDepth: number,
  disabledFocus: boolean,
  focusedItem: string,
  itemHeight: number,
  id: any,
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
};

type State = {
  actors: Set<string>,
  expandedPaths: Set<string>,
  focusedItem: ?Node,
  loadedProperties: LoadedProperties,
};


module.exports = (props: Props) => {
  if (!props.hasOwnProperty("id")) {
    throw Error("The ObjectInspector needs a unique `id` prop");
  }

  const initialState = states.get(props.id) || {
    actors: new Set(),
    expandedPaths: new Set(),
    focusedItem: props.focusedItem,
    loadedProperties: new Map(),
    loading: new Map(),
  };

  const statePersister = store => next => action => {
    let result = next(action);
    let state = store.getState();
    console.log('statePersister', {id: props.id, action, state});
    states.set(props.id, store.getState());
    return result;
  };

  const store = createStore(
    createReducer(initialState),
    applyMiddleware(thunk(), statePersister)
  );

  return createElement(
    Provider,
    {store},
    ObjectInspector(props)
  );
};
