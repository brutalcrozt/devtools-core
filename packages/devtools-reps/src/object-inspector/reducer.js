/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

module.exports = (initialState) => {
  return function (state = initialState, action) {
    console.log("store action", {state, action});
    const {
      type,
      data,
    } = action;

    if (type === "NODE_EXPAND") {
      return Object.assign({}, state, {
        expandedPaths: new Set(state.expandedPaths).add(data.node.path)
      });
    }

    if (type === "NODE_PROPERTIES_LOADED") {
      // const isRoot = this.props.roots.some(root => {
      //   const rootValue = getValue(root);
      //   return rootValue && rootValue.actor === value.actor;
      // });

      return Object.assign({}, state, {
        // actors: isRoot
        //   ? state.actors
        //   : (new Set(state.actors)).add(value.actor),
        loadedProperties: (new Map(state.loadedProperties))
          .set(data.node.path, data.properties),
      });
    }

    if (type === "NODE_COLLAPSE") {
      const expandedPaths = new Set(state.expandedPaths);
      expandedPaths.delete(data.node.path);
      return Object.assign({}, state, {expandedPaths});
    }

    if (type === "NODE_FOCUS") {
      return Object.assign({}, state, {
        focusedItem: data.node
      });
    }

    return state;
  };
};
