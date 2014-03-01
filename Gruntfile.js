module.exports = function (grunt) {
    grunt.initConfig({
         pkg: grunt.file.readJSON('package.json'),
         opts: {
             demoPath: 'demo',
             sassPath: 'scss',
             filename: 'jquery.select-edit'
         },

        compass: {
            dist: {
                options: {
                    cssPath: '<%= opts.demoPath %>',
                    sassPath: '<%= opts.sassPath %>',
                    noLineComments: true,
                    require: ["compass"]
                }
            }
        },

        watch : {
            demo: {
                files : [
                    '<%= opts.demoPath %>/**/*.html',
                    '<%= opts.sassPath %>/**/*.scss',
                    '!<%= opts.demoPath %>/**/*.css'
                ],
                tasks: ['compass'],

                options: {
                    livereload: true
                }
            },

            script: {
                files : '<%= opts.filename %>.js',
                tasks: ['task-js'],
                options: {
                    livereload: true
                }
            }
        },

        uglify: {
            options: {
                report: 'gzip'
            },
            main: {
                files: {'<%= opts.filename %>.min.js': ['<%= opts.filename %>.js']}
            }
        },

        copy: {
            main: {
                files: [{
                    expand: true,
                    flatten: true,
                    src: ['<%= opts.filename %>.min.js'],
                    dest: '<%= opts.demoPath %>'
                }]
            }
        },

        connect : {
            server : {
                options: {
                    port : 5050,
                    livereload: true,
                    base : 'demo'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');


    grunt.registerTask('task-js', ['uglify', 'copy']);

    grunt.registerTask('default', ['connect', 'compass', 'task-js', 'watch']);
};
