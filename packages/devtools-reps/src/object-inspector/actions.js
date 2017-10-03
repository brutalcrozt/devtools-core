/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {
  getClosestGripNode,
  getValue,
  shouldLoadItemEntries,
  shouldLoadItemIndexedProperties,
  shouldLoadItemNonIndexedProperties,
  shouldLoadItemPrototype,
  shouldLoadItemSymbols,
} = require("./utils/node");

const {
  enumEntries,
  enumIndexedProperties,
  enumNonIndexedProperties,
  getPrototype,
  enumSymbols,
} = require("./utils/client");

function nodeExpand(node) {
  return {
    type: "NODE_EXPAND",
    data: {node}
  };
}

function nodeCollapse(node) {
  return {
    type: "NODE_COLLAPSE",
    data: {node}
  };
}

function nodeFocus(node) {
  return {
    type: "NODE_FOCUS",
    data: {node}
  };
}

function nodeLoadProperties(item, loadedProperties, createObjectClient) {
  return async ({dispatch}) => {
    try {
      const gripItem = getClosestGripNode(item);
      const value = getValue(gripItem);

      const [start, end] = item.meta
        ? [item.meta.startIndex, item.meta.endIndex]
        : [];

      let promises = [];
      let objectClient;
      const getObjectClient = () => objectClient || createObjectClient(value);

      if (shouldLoadItemIndexedProperties(item, loadedProperties)) {
        promises.push(enumIndexedProperties(getObjectClient(), start, end));
      }

      if (shouldLoadItemNonIndexedProperties(item, loadedProperties)) {
        promises.push(enumNonIndexedProperties(getObjectClient(), start, end));
      }

      if (shouldLoadItemEntries(item, loadedProperties)) {
        promises.push(enumEntries(getObjectClient(), start, end));
      }

      if (shouldLoadItemPrototype(item, loadedProperties)) {
        promises.push(getPrototype(getObjectClient()));
      }

      if (shouldLoadItemSymbols(item, loadedProperties)) {
        promises.push(enumSymbols(getObjectClient(), start, end));
      }

      if (promises.length > 0) {
        const responses = await Promise.all(promises);
        dispatch(nodePropertiesLoaded(item, responses));
      }
    } catch (e) {
      console.error(e);
    }
  };
}

function nodePropertiesLoaded(node, responses) {
  // Let's loop through the responses to build a single response object.
  const properties = responses.reduce((accumulator, res) => {
    Object.entries(res).forEach(([k, v]) => {
      if (accumulator.hasOwnProperty(k)) {
        if (Array.isArray(accumulator[k])) {
          accumulator[k].push(...v);
        } else if (typeof accumulator[k] === "object") {
          accumulator[k] = Object.assign({}, accumulator[k], v);
        }
      } else {
        accumulator[k] = v;
      }
    });
    return accumulator;
  }, {});

  return {
    type: "NODE_PROPERTIES_LOADED",
    data: {node, properties}
  };
}

module.exports = {
  nodeExpand,
  nodeCollapse,
  nodeFocus,
  nodeLoadProperties,
  nodePropertiesLoaded,
};
