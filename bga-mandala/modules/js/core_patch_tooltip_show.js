define([
	"dojo", "dojo/_base/declare",
	"dojo/_base/array", "dojo/dom", "dojo/_base/lang", "dojo/mouse", "dojo/on",
	"dijit/Tooltip"
],
	function (dojo, declare, array, dom, lang, mouse, on, Tooltip) {
		return declare("ebg.core.core_patch_tooltip_show", null, {
			constructor: function () {
				console.log('ebg.core.core_patch_tooltip_show constructor');
				Tooltip.prototype._setConnectIdAttr = this._setConnectIdAttr;
			},
			
			/* patch to make tooltip displayed on safari ios*/
			_setConnectIdAttr: function (/*String|String[]|DomNode|DomNode[]*/ newId) {
				// summary:
				//		Connect to specified node(s)

				// Remove connections to old nodes (if there are any)
				array.forEach(this._connections || [], function (nested) {
					array.forEach(nested, function (handle) { handle.remove(); });
				}, this);

				// Make array of id's to connect to, excluding entries for nodes that don't exist yet, see startup()
				this._connectIds = array.filter(lang.isArrayLike(newId) ? newId : (newId ? [newId] : []),
					function (id) { return dom.byId(id, this.ownerDocument); }, this);

				// Make connections
				this._connections = array.map(this._connectIds, function (id) {
					var t = null;
					var node = dom.byId(id, this.ownerDocument),
						selector = this.selector,
						delegatedEvent = selector ?
							function (eventType) { return on.selector(selector, eventType); } :
							function (eventType) { return eventType; },
						self = this/* ,
						target = node */;
					return [
						// pointerenter is prefferred over mouseenter as on touch device releasing the pointer will trigger false mousenter.
						// mousenter false events will break the expected behaviour that if a parent div is attach to a tooltip
						// and a child div is attached to another tooltip you expect the child tooltip to show when you touch the child
						on(node, delegatedEvent(('PointerEvent' in window) ? "pointerenter":"mouseenter"), function (e) {
							// e.stopPropagation();
							// console.log(e.type, e.target);
							t2 = Date.now();
							if ((t== null) || ((t2 - t) > 300))
								self._onHover(this);
						}),
						on(node, delegatedEvent("focusin"), function (e) {
							// e.stopPropagation();
							// console.log(e.type, e.target);
							self._onHover(this);
						}),
						/* begin of patch for safari ios */
						on(node, delegatedEvent("touchstart"), function (e) { //pointerdown
							e.stopPropagation();
							if (e.touches.length === 1){
								t = Date.now();
								// console.log(e.type, e.target);
								var hideFct = function (e) {
									// console.log("hideFct, close tooltip", e.type);
									document.removeEventListener("touchstart", hideFct, true);
									self.set("state", "DORMANT");
								};
								var stopTimerFct = function (e) {
									var t2 = Date.now();
									// console.log("stopTimerFct", e.type, e.target);
									document.removeEventListener("touchcancel", stopTimerFct, true);
									document.removeEventListener("touchend", stopTimerFct, true);
									document.removeEventListener("pointerout", stopTimerFct, true); 
									if (self.state == "SHOWING") { //already showing, no time to stop
										document.addEventListener("touchstart", hideFct, true);
										// console.log("monitor touchstart", e.type, e.target);
									} else { // stop timer
										self.set("state", "DORMANT");
										// console.log("close tooltip", e.type, e.target);
									}
								};
								document.addEventListener("touchend", stopTimerFct, true);
								document.addEventListener("touchcancel", stopTimerFct, true);
								document.addEventListener("pointerout", stopTimerFct, true); 
								self._onHover(this);
							}
						}, true),
						/* end of patch*/
						on(node, delegatedEvent("mouseleave"), lang.hitch(self, "_onUnHover")),
						on(node, delegatedEvent("focusout"), lang.hitch(self, "set", "state", "DORMANT"))
					];
				}, this);

				this._set("connectId", newId);
			},
		});
	});