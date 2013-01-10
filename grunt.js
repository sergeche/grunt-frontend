module.exports = function(grunt) {
	"use strict";

	// Project configuration.
	grunt.initConfig({
		test: {
			files: ['test/*.js']
		},
		lint: {
			files: ['grunt.js', 'tasks/**/*.js', 'test/*.js']
		},
		watch: {
			files: '<config:lint.files>',
			tasks: 'default'
		},
		jshint: {
			options: {
				curly:     true,
				eqeqeq:    false,
				immed:     true,
				latedef:   true,
				newcap:    true,
				noarg:     true,
				sub:       true,
				undef:     true,
				boss:      true,
				eqnull:    true,
				node:      true,
				es5:       true,
				smarttabs: true
			},
			globals: {}
		},

		frontend: {
			production: {
				options: {
					webroot: './out',
					srcWebroot: './test'
				},
				css: {
					src: 'test/css',
					dest: 'out/css'
				},
				js: {
					'out/js/f.js': [
						'test/js/file1.js',
						'test/js/file2.js'
					]
				}
			}
		}
	});

	// Load local tasks.
	grunt.loadTasks('tasks');

	// Default task.
	grunt.registerTask('default', 'lint test');
};
