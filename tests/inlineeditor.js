/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals document */

import InlineEditorUI from '../src/inlineeditorui';
import InlineEditorUIView from '../src/inlineeditoruiview';

import HtmlDataProcessor from '@ckeditor/ckeditor5-engine/src/dataprocessor/htmldataprocessor';
import buildViewConverter from '@ckeditor/ckeditor5-engine/src/conversion/buildviewconverter';
import buildModelConverter from '@ckeditor/ckeditor5-engine/src/conversion/buildmodelconverter';

import InlineEditor from '../src/inlineeditor';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';

import testUtils from '@ckeditor/ckeditor5-core/tests/_utils/utils';
import count from '@ckeditor/ckeditor5-utils/src/count';

testUtils.createSinonSandbox();

describe( 'InlineEditor', () => {
	let editor, editorElement;

	beforeEach( () => {
		editorElement = document.createElement( 'div' );
		editorElement.innerHTML = '<p><strong>foo</strong> bar</p>';

		document.body.appendChild( editorElement );
	} );

	afterEach( () => {
		editorElement.remove();
	} );

	describe( 'constructor()', () => {
		beforeEach( () => {
			editor = new InlineEditor( editorElement );
		} );

		it( 'creates a single div editable root in the view', () => {
			expect( editor.editing.view.getRoot() ).to.have.property( 'name', 'div' );
		} );

		it( 'creates a single document root', () => {
			expect( count( editor.document.getRootNames() ) ).to.equal( 1 );
			expect( editor.document.getRoot() ).to.have.property( 'name', '$root' );
		} );

		it( 'creates the UI using BoxedEditorUI classes', () => {
			expect( editor.ui ).to.be.instanceof( InlineEditorUI );
			expect( editor.ui.view ).to.be.instanceof( InlineEditorUIView );
		} );

		it( 'uses HTMLDataProcessor', () => {
			expect( editor.data.processor ).to.be.instanceof( HtmlDataProcessor );
		} );
	} );

	describe( 'create()', () => {
		beforeEach( function() {
			return InlineEditor
				.create( editorElement, {
					plugins: [ Paragraph, Bold ]
				} )
				.then( newEditor => {
					editor = newEditor;
				} );
		} );

		afterEach( () => {
			return editor.destroy();
		} );

		it( 'creates an instance which inherits from the InlineEditor', () => {
			expect( editor ).to.be.instanceof( InlineEditor );
		} );

		it( 'creates element–less UI view', () => {
			expect( editor.ui.view.element ).to.be.null;
		} );

		it( 'attaches editable UI as view\'s DOM root', () => {
			expect( editor.editing.view.getDomRoot() ).to.equal( editor.ui.view.editable.element );
		} );

		it( 'loads data from the editor element', () => {
			expect( editor.getData() ).to.equal( '<p><strong>foo</strong> bar</p>' );
		} );

		// #25
		it( 'creates an instance of a InlineEditor child class', () => {
			// Fun fact: Remove the next 3 lines and you'll get a lovely inf loop due to two
			// editor being initialized on one element.
			const editorElement = document.createElement( 'div' );
			editorElement.innerHTML = '<p><strong>foo</strong> bar</p>';

			document.body.appendChild( editorElement );

			class CustomInlineEditor extends InlineEditor {}

			return CustomInlineEditor
				.create( editorElement, {
					plugins: [ Paragraph, Bold ]
				} )
				.then( newEditor => {
					expect( newEditor ).to.be.instanceof( CustomInlineEditor );
					expect( newEditor ).to.be.instanceof( InlineEditor );

					expect( newEditor.getData() ).to.equal( '<p><strong>foo</strong> bar</p>' );

					editorElement.remove();

					return newEditor.destroy();
				} );
		} );
	} );

	describe( 'create - events', () => {
		afterEach( () => {
			return editor.destroy();
		} );

		it( 'fires all events in the right order', () => {
			const fired = [];

			function spy( evt ) {
				fired.push( evt.name );
			}

			class EventWatcher extends Plugin {
				init() {
					this.editor.on( 'pluginsReady', spy );
					this.editor.on( 'uiReady', spy );
					this.editor.on( 'dataReady', spy );
					this.editor.on( 'ready', spy );
				}
			}

			return InlineEditor
				.create( editorElement, {
					plugins: [ EventWatcher ]
				} )
				.then( newEditor => {
					expect( fired ).to.deep.equal( [ 'pluginsReady', 'uiReady', 'dataReady', 'ready' ] );

					editor = newEditor;
				} );
		} );

		it( 'fires dataReady once data is loaded', () => {
			let data;

			class EventWatcher extends Plugin {
				init() {
					this.editor.on( 'dataReady', () => {
						data = this.editor.getData();
					} );
				}
			}

			return InlineEditor
				.create( editorElement, {
					plugins: [ EventWatcher, Paragraph, Bold ]
				} )
				.then( newEditor => {
					expect( data ).to.equal( '<p><strong>foo</strong> bar</p>' );

					editor = newEditor;
				} );
		} );

		it( 'fires uiReady once UI is ready', () => {
			let isReady;

			class EventWatcher extends Plugin {
				init() {
					this.editor.on( 'uiReady', () => {
						isReady = this.editor.ui.view.ready;
					} );
				}
			}

			return InlineEditor
				.create( editorElement, {
					plugins: [ EventWatcher ]
				} )
				.then( newEditor => {
					expect( isReady ).to.be.true;

					editor = newEditor;
				} );
		} );
	} );

	describe( 'destroy', () => {
		beforeEach( function() {
			return InlineEditor
				.create( editorElement, { plugins: [ Paragraph ] } )
				.then( newEditor => {
					editor = newEditor;

					const schema = editor.document.schema;

					schema.registerItem( 'heading' );
					schema.allow( { name: 'heading', inside: '$root' } );
					schema.allow( { name: '$text', inside: 'heading' } );

					buildModelConverter().for( editor.data.modelToView )
						.fromElement( 'heading' )
						.toElement( 'heading' );

					buildViewConverter().for( editor.data.viewToModel )
						.fromElement( 'heading' )
						.toElement( 'heading' );

					buildModelConverter().for( editor.editing.modelToView )
						.fromElement( 'heading' )
						.toElement( 'heading-editing-representation' );
				} );
		} );

		it( 'sets the data back to the editor element', () => {
			editor.setData( '<p>a</p><heading>b</heading>' );

			return editor.destroy()
				.then( () => {
					expect( editorElement.innerHTML )
						.to.equal( '<p>a</p><heading>b</heading>' );
				} );
		} );
	} );
} );
