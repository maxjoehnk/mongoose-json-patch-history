import chai         = require('chai');
import sinon        = require('sinon');
import sinonChai    = require('sinon-chai');
import asPromised   = require('chai-as-promised');
import Q            = require('q');

import plugin       = require('../lib');

chai.use(sinonChai);
chai.use(asPromised);

let expect = chai.expect;

describe('mongoose-json-patch-history', function () {
    let mongoose;
    let schema;
    let virtual;
    let model;

    let options;

    beforeEach(function () {
        mongoose = {
            model: sinon.stub()
        };
        virtual = {
            get: sinon.stub(),
            set: sinon.stub()
        };
        schema = {
            method: sinon.stub(),
            virtual: sinon.stub().returns(virtual),
            post: sinon.stub(),
            pre: sinon.stub()
        };
        model = {
            create: sinon.stub(),
            find: sinon.stub().returnsThis(),
            exec: sinon.stub(),
            remove: sinon.stub()
        };

        options = {
            database: mongoose
        };
    });

    describe('post init hook', function() {
        let document;
        let next;

        beforeEach(function() {
            document = {
                toObject: sinon.stub()
            };
            next = sinon.stub();
        });

        it('should be added', function() {
            plugin(schema, options);
            expect(schema.post).to.have.been.calledWith('init');
        });

        it('should copy the document to the $original variable', function() {
            var obj = {
                name: 'test'
            };
            document.name = 'test';
            document.toObject.returns(obj);
            schema.post.yieldsOn(document, next);
            plugin(schema, options);
            expect(document.toObject).to.have.been.calledOnce;
            expect(document.$original).to.deep.equal(obj);
        });

        it('should call the next function', function() {
            schema.post.yieldsOn(document, next);
            plugin(schema, options);
            expect(next).to.have.been.calledOnce;
        });
    });

    describe('pre save hook', function() {
        let document;
        let next;

        beforeEach(function() {
            document = {
                id: 'stubid',
                $history: model,
                isNew: true,
                _doc: {
                    title: 'stub'
                }
            };
            next = sinon.stub();
        });

        it('should be added', function() {
            plugin(schema, options);
            expect(schema.pre).to.have.been.calledWith('save');
        });

        it('should store the current state', function () {
            model.create.returns(Promise.resolve());
            schema.pre.yieldsOn(document, next);
            plugin(schema, options);
            expect(model.create).to.have.been.calledWith({
                ref: document.id,
                patches: [{
                    op: 'add',
                    path: '/title',
                    value: 'stub'
                }]
            });
        });

        it('should call the next function', function() {
            var promise = Promise.resolve();
            model.create.returns(promise);
            schema.pre.yieldsOn(document, next);
            plugin(schema, options);
            return promise.then(() => {
                expect(next).to.have.been.calledOnce;
            });
        });
    });

    describe('history method', function() {
        let document;

        beforeEach(function() {
            document = {
                id: 'stubid',
                $history: model,
                isNew: true,
                _doc: {
                    title: 'stub'
                }
            };
        });

        it('should be registered', function() {
            plugin(schema, options);
            expect(schema.method).to.have.been.calledWith('history');
        });

        it('should return a function object', function(done) {
            schema.method = function(name, fnc) {
                if (name === 'history') {
                    let history = fnc();
                    expect(history).to.have.property('store');
                    expect(history).to.have.property('retrieve');
                    expect(history).to.have.property('clear');
                    done()
                }
            };
            plugin(schema, options);
        });
    });

    describe('patch method', function() {
        let patches;
        let document;

        beforeEach(function() {
            document = {
                save: sinon.stub()
            };
            patches = [{
                op: 'add',
                path: '/title',
                value: 'stub'
            }];
        });

        it('should be registered', function() {
            plugin(schema, options);
            expect(schema.method).to.have.been.calledWith('patch');
        });

        it('should apply the patches and save', function(done) {
            schema.method = function(name, cb) {
                if (name === 'patch') {
                    let patch = cb.bind(document);
                    patch(patches);
                    expect(document).to.have.property('title', 'stub');
                    expect(document.save).to.have.been.calledOnce;
                    done()
                }
            };
            plugin(schema, options);
        });

        it('should apply the patches, but not save', function(done) {
            schema.method = function(name, cb) {
                if (name === 'patch') {
                    let patch = cb.bind(document);
                    patch(patches, false);
                    expect(document).to.have.property('title', 'stub');
                    expect(document.save).to.not.have.been.called;
                    done()
                }
            };
            plugin(schema, options);
        });

        it('should do nothing when there are no patches', function(done) {
            schema.method = function(name, cb) {
                if (name === 'patch') {
                    let patch = cb.bind(document);
                    patch([]);
                    expect(document.save).to.not.have.been.called;
                    done()
                }
            };
            plugin(schema, options);
        });
    });

    it('should register a $history virtual', function() {
        plugin(schema, options);
        expect(schema.virtual).to.have.been.calledWith('$history');
    });
});