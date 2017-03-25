var myApp = angular.module('myApp', ['ngRoute']);

myApp.config(['$routeProvider', function($routeProvider) {

    $routeProvider
        .when('/', {
            templateUrl: '/views/templates/home.html',
            controller: 'HomeController',
            controllerAs: 'hc'
        })
        // .when('/game', {
        //   templateUrl: '/views/templates/game.html',
        //   controller: 'GameController',
        //   controllerAs: 'gc'
        // })
        // .when('/player', {
        //     templateUrl: '/views/templates/player.html',
        //     controller: 'PlayerController',
        //     controllerAs: 'pc'
        // })
        .otherwise({
            redirectTo: 'home'
        });
}]);
