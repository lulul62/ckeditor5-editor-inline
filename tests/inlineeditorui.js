/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals document, Event */

import ComponentFactory from '@ckeditor/ckeditor5-ui/src/componentfactory';
import View from '@ckeditor/ckeditor5-ui/src/view';

import InlineEditorUI from '../src/inlineeditorui';
import InlineEditorUIView from '../src/inlineeditoruiview';
import VirtualTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor';

import FocusTracker from '@ckeditor/ckeditor5-utils/src/focustracker';

import { keyCodes } from '@ckeditor/ckeditor5-utils/src/keyboard';
import testUtils from '@ckeditor/ckeditor5-core/tests/_utils/utils';
import utils from '@ckeditor/ckeditor5-utils/tests/_utils/utils';

testUtils.createSinonSandbox();

describe( 'InlineEditorUI', () => {
	let editor, editable, view, ui;

	describe( 'constructor()', () => {
		beforeEach( () => {
			return VirtualTestEditor
				.create( {
					toolbar: [ 'foo', 'bar' ]
				} )
				.then( newEditor => {
					initializeUiAndView( newEditor );
					ui.init();
				} );
		} );

		afterEach( () => {
			ui.destroy();
			editor.destroy();
		} );

		it( 'sets #editor', () => {
			expect( ui.editor ).to.equal( editor );
		} );

		it( 'sets #view', () => {
			expect( ui.view ).to.equal( view );
		} );

		it( 'creates #componentFactory factory', () => {
			expect( ui.componentFactory ).to.be.instanceOf( ComponentFactory );
		} );

		it( 'creates #focusTracker', () => {
			expect( ui.focusTracker ).to.be.instanceOf( FocusTracker );
		} );

		describe( 'panel', () => {
			it( 'binds view.panel#isVisible to editor.ui#focusTracker', () => {
				ui.focusTracker.isFocused = false;
				expect( view.panel.isVisible ).to.be.false;

				ui.focusTracker.isFocused = true;
				expect( view.panel.isVisible ).to.be.true;
			} );

			it( 'doesn\'t set the view#viewportTopOffset, if not specified in the config', () => {
				expect( view.viewportTopOffset ).to.equal( 0 );
			} );

			it( 'sets view#viewportTopOffset, if specified', () => {
				return VirtualTestEditor
					.create( {
						toolbar: {
							viewportTopOffset: 100
						}
					} )
					.then( editor => {
						const view = new InlineEditorUIView( editor.locale );
						const ui = new InlineEditorUI( editor, view );

						ui.init();
						expect( view.viewportTopOffset ).to.equal( 100 );
						ui.destroy();

						return editor.destroy();
					} );
			} );

			// https://github.com/ckeditor/ckeditor5-editor-inline/issues/4
			it( 'pin() is called on editor.editable.view#render', () => {
				const spy = sinon.stub( view.panel, 'pin' );

				view.panel.hide();

				editor.editing.view.fire( 'render' );
				sinon.assert.notCalled( spy );

				view.panel.show();

				editor.editing.view.fire( 'render' );
				sinon.assert.calledOnce( spy );
				sinon.assert.calledWithExactly( spy, {
					target: view.editableElement,
					positions: sinon.match.array
				} );
			} );
		} );

		describe( 'editable', () => {
			it( 'registers view.editable#element in editor focus tracker', () => {
				ui.focusTracker.isFocused = false;

				view.editable.element.dispatchEvent( new Event( 'focus' ) );
				expect( ui.focusTracker.isFocused ).to.true;
			} );

			it( 'sets view.editable#name', () => {
				expect( view.editable.name ).to.equal( editable.rootName );
			} );

			it( 'binds view.editable#isFocused', () => {
				utils.assertBinding(
					view.editable,
					{ isFocused: false },
					[
						[ ui.focusTracker, { isFocused: true } ]
					],
					{ isFocused: true }
				);
			} );

			it( 'binds view.editable#isReadOnly', () => {
				utils.assertBinding(
					view.editable,
					{ isReadOnly: false },
					[
						[ editable, { isReadOnly: true } ]
					],
					{ isReadOnly: true }
				);
			} );
		} );
	} );

	describe( 'init()', () => {
		beforeEach( () => {
			return VirtualTestEditor
				.create( {
					toolbar: [ 'foo', 'bar' ]
				} )
				.then( newEditor => {
					initializeUiAndView( newEditor );
				} );
		} );

		afterEach( () => {
			ui.destroy();
			editor.destroy();
		} );

		it( 'initializes the #view', () => {
			const spy = sinon.spy( view, 'init' );

			ui.init();
			sinon.assert.calledOnce( spy );
		} );

		describe( 'view.toolbar#items', () => {
			it( 'are filled with the config.toolbar (specified as an Array)', () => {
				const spy = testUtils.sinon.spy( view.toolbar, 'fillFromConfig' );

				ui.init();
				sinon.assert.calledWithExactly( spy, editor.config.get( 'toolbar' ), ui.componentFactory );
			} );

			it( 'are filled with the config.toolbar (specified as an Object)', () => {
				return VirtualTestEditor
					.create( {
						toolbar: {
							items: [ 'foo', 'bar' ],
							viewportTopOffset: 100
						}
					} )
					.then( newEditor => {
						initializeUiAndView( newEditor );

						const spy = testUtils.sinon.spy( view.toolbar, 'fillFromConfig' );

						ui.init();
						sinon.assert.calledWithExactly( spy,
							editor.config.get( 'toolbar.items' ),
							ui.componentFactory
						);
						ui.destroy();

						return editor.destroy();
					} );
			} );
		} );

		it( 'initializes keyboard navigation between view#toolbar and view#editable', () => {
			const spy = testUtils.sinon.spy( view.toolbar, 'focus' );

			ui.init();
			ui.focusTracker.isFocused = true;
			ui.view.toolbar.focusTracker.isFocused = false;

			editor.keystrokes.press( {
				keyCode: keyCodes.f10,
				altKey: true,
				preventDefault: sinon.spy(),
				stopPropagation: sinon.spy()
			} );

			sinon.assert.calledOnce( spy );
		} );
	} );

	describe( 'destroy()', () => {
		it( 'destroys the #view', () => {
			return VirtualTestEditor.create()
				.then( editor => {
					initializeUiAndView( editor );

					const spy = sinon.spy( view, 'destroy' );

					ui.init();
					ui.destroy();
					sinon.assert.calledOnce( spy );

					return editor.destroy();
				} );
		} );
	} );

	function initializeUiAndView( newEditor ) {
		editor = newEditor;
		view = new InlineEditorUIView( editor.locale );
		ui = new InlineEditorUI( editor, view );
		editable = editor.editing.view.getRoot();

		ui.componentFactory.add( 'foo', viewCreator( 'foo' ) );
		ui.componentFactory.add( 'bar', viewCreator( 'bar' ) );
	}
} );

function viewCreator( name ) {
	return locale => {
		const view = new View( locale );

		view.name = name;
		view.element = document.createElement( 'a' );

		return view;
	};
}
