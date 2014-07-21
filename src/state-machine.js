function first_function_key_in(object) {
	var keys = Object.keys(object);
	var i;
	var key;
	for(i = 0; i < keys.length; ++i) {
		key = keys[i];
		if(typeof(object[key]) === 'function') {
			return key;
		}
	}
}
function state_machine(machine, entry_key) {
	entry_key = entry_key || first_function_key_in(machine);
	if(!entry_key) {
		return;
	}
	if(typeof(machine[entry_key]) !== 'function') {
		throw new Error("Supplied state machine entry is not a function.");
	}
	machine[entry_key]();
}
module.exports = state_machine;
