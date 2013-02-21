define(function () {

    return {
        template: 
            '<section id="main">\
                <input id="toggle-all" type="checkbox">\
                <label for="toggle-all">Mark all as complete</label>\
                <ul id="todo-list"></ul>\
            </section>',

        initialize: function () {
            this.render();
            this.cacheElements();
            this.attachEvents();
        },

        render: function () {
            this.$el.html(this.template);
        },

        cacheElements: function () {
            this.$todoList = this.$el.find('#todo-list');
            this.$toggleAll = this.$el.find('#toggle-all');

        },

        attachEvents: function () {
            this.sandbox.on('tasks/createNewTask', function () {
                alert('aaaa');
            });
        }
    };

});