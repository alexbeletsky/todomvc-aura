define(['underscore'], function (_) {

    return {
        template: 
            '<header id="header">\
                <h1>todos</h1>\
                <input id="new-todo" placeholder="What needs to be done?" autofocus>\
            </header>',

        initialize: function () {
            _.bindAll(this);

            this.render();
            this.cacheElements();
            this.attachEvents();
        },

        render: function () {
            this.$el.html(this.template);
        },

        cacheElements: function () {
            this.$newTodo = this.$el.find('#new-todo');
        },

        attachEvents: function () {
            this.$el.find('#new-todo').on('keyup', this.createNewTask);
        },

        createNewTask: function(e) {
            if (e.which === 13) {
                var val = this.$newTodo.val();
                this.sandbox.emit('ui/createNewTask', {description: val});
                this.$newTodo.val('');
            }
        }
    };

});