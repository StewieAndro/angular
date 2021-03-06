/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {defineComponent, defineDirective} from '../../src/render3/index';
import {bind, container, containerRefreshEnd, containerRefreshStart, elementAttribute, elementClassNamed, elementEnd, elementProperty, elementStart, embeddedViewEnd, embeddedViewStart, load, loadDirective, text, textBinding} from '../../src/render3/instructions';

import {renderToHtml} from './render_util';

describe('exports', () => {
  it('should support export of DOM element', () => {

    /** <input value="one" #myInput> {{ myInput.value }} */
    function Template(ctx: any, cm: boolean) {
      if (cm) {
        elementStart(0, 'input', ['value', 'one'], ['myInput', '']);
        elementEnd();
        text(1);
      }
      let myInput = elementStart(0);
      textBinding(1, (myInput as any).value);
    }

    expect(renderToHtml(Template, {})).toEqual('<input value="one">one');
  });

  it('should support basic export of component', () => {

    /** <comp #myComp></comp> {{ myComp.name }} */
    function Template(ctx: any, cm: boolean) {
      if (cm) {
        elementStart(0, 'comp', null, ['myComp', '']);
        elementEnd();
        text(1);
      }
      // TODO: replace loadDirective when removing directive refs
      textBinding(1, loadDirective<MyComponent>(0).name);
    }

    class MyComponent {
      name = 'Nancy';

      static ngComponentDef = defineComponent({
        type: MyComponent,
        selector: [[['comp'], null]],
        template: function() {},
        factory: () => new MyComponent
      });
    }

    expect(renderToHtml(Template, {}, [MyComponent.ngComponentDef])).toEqual('<comp></comp>Nancy');
  });

  it('should support component instance fed into directive', () => {

    let myComponent: MyComponent;
    let myDir: MyDir;
    class MyComponent {
      constructor() { myComponent = this; }
      static ngComponentDef = defineComponent({
        type: MyComponent,
        selector: [[['comp'], null]],
        template: function() {},
        factory: () => new MyComponent
      });
    }

    class MyDir {
      myDir: MyComponent;
      constructor() { myDir = this; }
      static ngDirectiveDef = defineDirective({
        type: MyDir,
        selector: [[['', 'myDir', ''], null]],
        factory: () => new MyDir,
        inputs: {myDir: 'myDir'}
      });
    }

    const defs = [MyComponent.ngComponentDef, MyDir.ngDirectiveDef];

    /** <comp #myComp></comp> <div [myDir]="myComp"></div> */
    function Template(ctx: any, cm: boolean) {
      if (cm) {
        elementStart(0, 'comp', null, ['myComp', '']);
        elementEnd();
        elementStart(1, 'div', ['myDir', '']);
        elementEnd();
      }
      // TODO: replace loadDirective when removing directive refs
      elementProperty(1, 'myDir', bind(loadDirective<MyComponent>(0)));
    }

    renderToHtml(Template, {}, defs);
    expect(myDir !.myDir).toEqual(myComponent !);
  });

  it('should work with directives with exportAs set', () => {

    /** <div someDir #myDir="someDir"></div> {{ myDir.name }} */
    function Template(ctx: any, cm: boolean) {
      if (cm) {
        elementStart(0, 'div', ['someDir', ''], ['myDir', 'someDir']);
        elementEnd();
        text(1);
      }
      // TODO: replace loadDirective when removing directive refs
      textBinding(1, loadDirective<SomeDir>(0).name);
    }

    class SomeDir {
      name = 'Drew';
      static ngDirectiveDef = defineDirective({
        type: SomeDir,
        selector: [[['', 'someDir', ''], null]],
        factory: () => new SomeDir,
        exportAs: 'someDir'
      });
    }

    expect(renderToHtml(Template, {}, [SomeDir.ngDirectiveDef]))
        .toEqual('<div somedir=""></div>Drew');
  });

  describe('forward refs', () => {
    it('should work with basic text bindings', () => {
      /** {{ myInput.value}} <input value="one" #myInput> */
      function Template(ctx: any, cm: boolean) {
        if (cm) {
          text(0);
          elementStart(1, 'input', ['value', 'one'], ['myInput', '']);
          elementEnd();
        }
        let myInput = elementStart(1);
        textBinding(0, bind((myInput as any).value));
      }

      expect(renderToHtml(Template, {})).toEqual('one<input value="one">');
    });


    it('should work with element properties', () => {
      /** <div [title]="myInput.value"</div> <input value="one" #myInput> */
      function Template(ctx: any, cm: boolean) {
        if (cm) {
          elementStart(0, 'div');
          elementEnd();
          elementStart(1, 'input', ['value', 'one'], ['myInput', '']);
          elementEnd();
        }
        let myInput = elementStart(1);
        elementProperty(0, 'title', bind(myInput && (myInput as any).value));
      }

      expect(renderToHtml(Template, {})).toEqual('<div title="one"></div><input value="one">');
    });

    it('should work with element attrs', () => {
      /** <div [attr.aria-label]="myInput.value"</div> <input value="one" #myInput> */
      function Template(ctx: any, cm: boolean) {
        if (cm) {
          elementStart(0, 'div');
          elementEnd();
          elementStart(1, 'input', ['value', 'one'], ['myInput', '']);
          elementEnd();
        }
        let myInput = elementStart(1);
        elementAttribute(0, 'aria-label', bind(myInput && (myInput as any).value));
      }

      expect(renderToHtml(Template, {})).toEqual('<div aria-label="one"></div><input value="one">');
    });

    it('should work with element classes', () => {
      /** <div [class.red]="myInput.checked"</div> <input type="checkbox" checked #myInput> */
      function Template(ctx: any, cm: boolean) {
        if (cm) {
          elementStart(0, 'div');
          elementEnd();
          elementStart(1, 'input', ['type', 'checkbox', 'checked', 'true'], ['myInput', '']);
          elementEnd();
        }
        let myInput = elementStart(1);
        elementClassNamed(0, 'red', bind(myInput && (myInput as any).checked));
      }

      expect(renderToHtml(Template, {}))
          .toEqual('<div class="red"></div><input checked="true" type="checkbox">');
    });

    it('should work with component refs', () => {

      let myComponent: MyComponent;
      let myDir: MyDir;

      class MyComponent {
        constructor() { myComponent = this; }

        static ngComponentDef = defineComponent({
          type: MyComponent,
          selector: [[['comp'], null]],
          template: function(ctx: MyComponent, cm: boolean) {},
          factory: () => new MyComponent
        });
      }

      class MyDir {
        myDir: MyComponent;

        constructor() { myDir = this; }

        static ngDirectiveDef = defineDirective({
          type: MyDir,
          selector: [[['', 'myDir', ''], null]],
          factory: () => new MyDir,
          inputs: {myDir: 'myDir'}
        });
      }

      /** <div [myDir]="myComp"></div><comp #myComp></comp> */
      function Template(ctx: any, cm: boolean) {
        if (cm) {
          elementStart(0, 'div', ['myDir', '']);
          elementEnd();
          elementStart(1, 'comp', null, ['myComp', '']);
          elementEnd();
        }
        // TODO: replace loadDirective when removing directive refs
        elementProperty(0, 'myDir', bind(loadDirective<MyComponent>(1)));
      }

      renderToHtml(Template, {}, [MyComponent.ngComponentDef, MyDir.ngDirectiveDef]);
      expect(myDir !.myDir).toEqual(myComponent !);
    });

    it('should work with multiple forward refs', () => {
      /** {{ myInput.value }} {{ myComp.name }} <comp #myComp></comp> <input value="one" #myInput>
       */
      function Template(ctx: any, cm: boolean) {
        if (cm) {
          text(0);
          text(1);
          elementStart(2, 'comp', null, ['myComp', '']);
          elementEnd();
          elementStart(3, 'input', ['value', 'one'], ['myInput', '']);
          elementEnd();
        }
        let myInput = elementStart(3);
        // TODO: replace loadDirective when removing directive refs
        let myComp = loadDirective<MyComponent>(0);
        textBinding(0, bind(myInput && (myInput as any).value));
        textBinding(1, bind(myComp && myComp.name));
      }

      let myComponent: MyComponent;

      class MyComponent {
        name = 'Nancy';

        constructor() { myComponent = this; }

        static ngComponentDef = defineComponent({
          type: MyComponent,
          selector: [[['comp'], null]],
          template: function() {},
          factory: () => new MyComponent
        });
      }
      expect(renderToHtml(Template, {}, [MyComponent.ngComponentDef]))
          .toEqual('oneNancy<comp></comp><input value="one">');
    });

    it('should work inside a view container', () => {
      function Template(ctx: any, cm: boolean) {
        if (cm) {
          elementStart(0, 'div');
          { container(1); }
          elementEnd();
        }
        containerRefreshStart(1);
        {
          if (ctx.condition) {
            let cm1 = embeddedViewStart(1);
            {
              if (cm1) {
                text(0);
                elementStart(1, 'input', ['value', 'one'], ['myInput', '']);
                elementEnd();
              }
              let myInput = elementStart(1);
              textBinding(0, bind(myInput && (myInput as any).value));
            }
            embeddedViewEnd();
          }
        }
        containerRefreshEnd();
      }

      expect(renderToHtml(Template, {
        condition: true
      })).toEqual('<div>one<input value="one"></div>');
      expect(renderToHtml(Template, {condition: false})).toEqual('<div></div>');
    });
  });
});
