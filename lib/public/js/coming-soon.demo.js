/*   
Template Name: Color Admin - Responsive Admin Dashboard Template build with Twitter Bootstrap 3.3.5
Version: 1.9.0
Author: Sean Ngu
Website: http://www.seantheme.com/color-admin-v1.9/admin/
*/

var handleCountdownTimer = function() {
    var startDate = new Date();
    startDate = new Date(2016,4,1);
    $('#timer').countdown({until: startDate});
};

var ComingSoon = function () {
	"use strict";
    return {
        //main function
        init: function () {
            handleCountdownTimer();
        }
    };
}();