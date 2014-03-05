/*
	Copyright (c) 2014 Guilherme Prá Vieira

	This file is part of Wysia.

	Wysia is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as
	published by the Free Software Foundation, either version 3 of
	the License, or (at your option) any later version.

	Wysia is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public
	License along with Wysia. If not, see <http://www.gnu.org/licenses/>.
*/
function merge(left, right) {
	var left_type = merge_data_type(left);
	var right_type = merge_data_type(right);
	var combination = left_type + '<-' + right_type;
	var fn_tab = {
		'object<-object': merge_objects
		, 'array<-array': merge_arrays
	};
	if(fn_tab[combination] === undefined) {
		return replace_data(left, right);
	}
	return fn_tab[combination](left, right);
}
function merge_data_type(value) {
	if(!value && value !== false) {
		return 'data';
	}
	switch(value.constructor) {
		case Object:
			return 'object';
		case Array:
			return 'array';
		default:
			return 'data';
	}
}
function merge_objects(left, right) {
	var mix = {};
	for(var key in left) {
		mix[key] = left[key];
	}
	for(var key in right) {
		mix[key] = merge(mix[key], right[key]);
	}
	return mix;
}
function merge_arrays(left, right) {
	return [].concat(left, right);
}
function replace_data(left, right) {
	return right;
}
module.exports = merge;
