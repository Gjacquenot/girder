var _              = require('underscore');
var girder         = require('girder/init');
var Events         = require('girder/events');
var FileCollection = require('girder/collections/FileCollection');
var View           = require('girder/view');
var EditFileWidget = require('girder/views/widgets/EditFileWidget');
var UploadWidget   = require('girder/views/widgets/UploadWidget');
var MiscFunctions  = require('girder/utilities/MiscFunctions');

var FileListTemplate = require('girder/templates/widgets/fileListTemplate.jade');

/**
 * This widget shows a list of files in a given item.
 */
var FileListWidget = View.extend({
    events: {
        'click a.g-show-more-files': function () {
            this.collection.fetchNextPage();
        },

        'click a.g-update-contents': function (e) {
            var cid = $(e.currentTarget).parent().attr('file-cid');
            this.uploadDialog(cid);
        },

        'click a.g-update-info': function (e) {
            var cid = $(e.currentTarget).parent().attr('file-cid');
            this.editFileDialog(cid);
        },

        'click a.g-delete-file': function (e) {
            var cid = $(e.currentTarget).parent().attr('file-cid');
            var file = this.collection.get(cid);

            MiscFunctions.confirm({
                text: 'Are you sure you want to delete the file <b>' +
                      file.escape('name') + '</b>?',
                yesText: 'Delete',
                escapedHtml: true,
                confirmCallback: _.bind(function () {
                    file.once('g:deleted', function () {
                        Events.trigger('g:alert', {
                            icon: 'ok',
                            type: 'success',
                            text: 'File deleted.',
                            timeout: 4000
                        });

                        this.render();
                    }, this).once('g:error', function () {
                        Events.trigger('g:alert', {
                            icon: 'cancel',
                            text: 'Failed to delete file.',
                            type: 'danger',
                            timeout: 4000
                        });
                    }).destroy();
                }, this)
            });
        }
    },

    initialize: function (settings) {
        this.upload = settings.upload;
        this.fileEdit = settings.fileEdit;
        this.checked = [];
        this.collection = new FileCollection();
        this.collection.altUrl = 'item/' +
            (settings.itemId || settings.item.get('_id')) + '/files';
        this.collection.append = true; // Append, don't replace pages
        this.collection.on('g:changed', function () {
            this.render();
            this.trigger('g:changed');
        }, this).fetch();

        this.parentItem = settings.item;
    },

    editFileDialog: function (cid) {
        this.editFileWidget = new EditFileWidget({
            el: $('#g-dialog-container'),
            file: this.collection.get(cid),
            parentView: this
        }).off('g:saved', null, this).on('g:saved', function () {
            this.render();
        }, this);
        this.editFileWidget.render();
    },

    uploadDialog: function (cid) {
        new UploadWidget({
            el: $('#g-dialog-container'),
            title: 'Replace file contents',
            parent: this.collection.get(cid),
            parentType: 'file',
            parentView: this
        }).on('g:uploadFinished', function () {
            Events.trigger('g:alert', {
                icon: 'ok',
                text: 'File contents updated.',
                type: 'success',
                timeout: 4000
            });
        }, this).render();
    },

    render: function () {
        this.checked = [];
        this.$el.html(FileListTemplate({
            files: this.collection.toArray(),
            hasMore: this.collection.hasNextPage(),
            girder: girder,
            parentItem: this.parentItem
        }));

        this.$('.g-file-actions-container a[title]').tooltip({
            container: 'body',
            placement: 'auto',
            delay: 100
        });

        if (this.fileEdit) {
            this.editFileDialog(this.fileEdit);
            this.fileEdit = false;
        } else if (this.upload) {
            this.uploadDialog(this.upload);
            this.upload = false;
        }

        return this;
    },

    /**
     * Insert a file into the collection and re-render it.
     */
    insertFile: function (file) {
        this.collection.add(file);
        this.render();
        this.trigger('g:changed');
    }
});

module.exports = FileListWidget;
