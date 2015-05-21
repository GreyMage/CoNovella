module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
		copy: {
			main: {
				expand: true,
				cwd: 'src/views',
				src: '**',
				dest: 'dist/views',
			},
		},
        concat: {
            options: {
                // define a string to put between each file in the concatenated output
                separator: '\n\n'
            },
            dist: {
                // the files to concatenate
                src: ['src/public/js/*.js'],
                // the location of the resulting JS file
                dest: 'dist/public/js/<%= pkg.name %>.js'
            }
        },
        uglify: {
            options: {
                // the banner is inserted at the top of the output
                banner: '/*! <%= pkg.name %> - <%= pkg.description %> By <%= pkg.author %> ( <%= pkg.homepage %> ), Built on <%= grunt.template.today("dd-mm-yyyy") %> */\n',
                sourceMap:true
            },
            dist: {
                files: {
                    'dist/public/js/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        },
        jshint: {
            // define the files to lint
            files: ['Gruntfile.js', 'src/**/*.js', '<%= jasmine.options.specs %>'],
            // configure JSHint (documented at http://www.jshint.com/docs/)
            options: {
                // more options here if you want to override JSHint defaults
                globals: {
                    jQuery: true,
                    console: true,
                    module: true
                }
            }
        },
        jasmine: {
            src: '<%= concat.dist.dest %>',
            options: {
                specs: 'spec/**/*.js',
                '--web-security': false
            }
        },
        watch: {
            files: ['<%= jshint.files %>', 'src/views/**', 'src/public/**'],
            tasks: ['jshint', 'copy', 'concat', 'jasmine', 'uglify', 'stylus'],
			options: {
				livereload: 9000,
			},
            //tasks: ['jshint', 'concat', 'uglify']
        },
		stylus: {
			compile: {
				files: {
					'dist/public/css/<%= pkg.name %>.css': 'src/public/css/index.styl' 
				}
			}
		}
    }); 

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jasmine');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-stylus');

    grunt.registerTask('test', ['jshint']);
    grunt.registerTask('build', ['jshint', 'copy', 'concat', 'jasmine', 'uglify', 'stylus']);
    grunt.registerTask('default', ['jshint', 'copy', 'concat', 'jasmine', 'uglify', 'stylus', 'watch']);

};