module.exports = function (grunt) {
  grunt.initConfig({
    connect: {
      server: {
        options: {
          hostname: "localhost",
          port: 9000,
          keepalive: true,
          open: true,
          base: "app",
          livereload: true,
        },
        watch: {
          js: {
            files: ["js/*.js"],
            tasks: ["tarea_js"],
            options: {
              livereload: true,
            },
          },
          css: {
            files: ["css/*.css"],
            tasks: ["tarea_css"],
            options: {
              livereload: true,
            },
          },
        },
      },
    },
  });

  grunt.loadNpmTasks("grunt-contrib-connect");

  grunt.registerTask("server", ["connect:server"]);
};
