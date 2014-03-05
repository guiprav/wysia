'use strict';
var wysia = window.wysia = {};
wysia.set_state_update_logic = function(form, state_update_fn) {
	var field = (function() {
		var name = '$state-update-logic';
		var field = form.querySelector('input[name="' + name + '"]');
		if(!field) {
			field = document.createElement('input');
			field.type = 'hidden';
			field.name = name;
			form.appendChild(field);
		}
		return field;
	})();
	field.value = '(' + state_update_fn.toString() + ')()';
};
