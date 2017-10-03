/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const React = require("react");
const { DOM: dom, PropTypes } = React;

const { MODE } = require("../../reps/constants");
const ObjectInspector = require("../../index").ObjectInspector;
const { Rep } = require("../../reps/rep");

const Result = React.createClass({
  displayName: "Result",

  propTypes: {
    expression: PropTypes.object.isRequired,
    showResultPacket: PropTypes.func.isRequired,
    hideResultPacket: PropTypes.func.isRequired,
    showReps: PropTypes.func.isRequired,
    hideReps: PropTypes.func.isRequired,
    createObjectClient: PropTypes.func.isRequired,
    releaseActor: PropTypes.func.isRequired,
  },

  copyPacketToClipboard: function (e, packet) {
    e.stopPropagation();

    let textField = document.createElement("textarea");
    textField.innerHTML = JSON.stringify(packet, null, "  ");
    document.body.appendChild(textField);
    textField.select();
    document.execCommand("copy");
    textField.remove();
  },

  onHeaderClick: function () {
    const {expression} = this.props;
    if (expression.showPacket === true) {
      this.props.hideResultPacket();
    } else {
      this.props.showResultPacket();
    }
  },

  onToggleClick: function () {
    const {expression} = this.props;
    if (expression.showReps !== false) {
      this.props.hideReps();
    } else {
      this.props.showReps();
    }
  },

  renderRepInAllModes: function ({ object }) {
    return Object.keys(MODE).map(modeKey =>
       this.renderRep({ object, modeKey })
     );
  },

  renderRep: function ({ object, modeKey }) {
    const {
      createObjectClient,
      releaseActor,
    } = this.props;
    const path = object.actor;

    return dom.div(
      {
        className: `rep-element`,
        key: `${path}${modeKey}`,
        "data-mode": modeKey
      },
      ObjectInspector({
        id: `${path}${modeKey}`,
        roots: [{
          path,
          contents: {
            value: object
          }
        }],
        autoExpandDepth: 0,
        createObjectClient,
        releaseActor,
        mode: MODE[modeKey],
        onInspectIconClick: nodeFront => console.log("inspectIcon click", nodeFront),
      })
    );
  },

  renderPacket: function (expression) {
    let {packet, showPacket} = expression;
    let headerClassName = showPacket ? "packet-expanded" : "packet-collapsed";
    let headerLabel = showPacket ? "Hide expression packet" : "Show expression packet";

    return dom.div({ className: "packet" },
      dom.header({
        className: headerClassName,
        onClick: this.onHeaderClick,
      },
        headerLabel,
        showPacket && dom.button({
          className: "copy-packet-button",
          onClick: (e) => this.copyPacketToClipboard(e, packet)
        }, "Copy as JSON")
      ),
      showPacket &&
      dom.div({className: "packet-rep"}, Rep({object: packet}))
    );
  },

  render: function () {
    let {expression} = this.props;
    let {input, packet, showReps = true} = expression;
    return dom.div(
      { className: "rep-row" },
      dom.header({},
        dom.button({
          className: "rep-toggle",
          onClick: this.onToggleClick,
        }, showReps ? "▼" : "▶︎"),
        dom.span({ className: "rep-input" }, input)
      ),
      showReps && dom.div({ className: "reps" }, this.renderRepInAllModes({
        object: packet.exception || packet.result
      })),
      this.renderPacket(expression)
    );
  }
});

module.exports = Result;
