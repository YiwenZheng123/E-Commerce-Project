import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { cartReducer } from '../src/store/reducers/cartReducer.js';
import { authReducer } from '../src/store/reducers/authReducer.js';
import { paymentMethodReducer } from '../src/store/reducers/paymentMethodReducer.js';

const product = { productId: 10, productName: 'Test product', stock: 10, specialPrice: 5 };
async function setup() {
    const storage = new Map();
    const errors = [];
    const toast = { success() {}, error(message) { errors.push(message); } };
    let account = 1;
    const database = new Map([[1, []], [2, []]]);
    const calls = [];
    const api = {
        async post(path, body) {
            calls.push(path);
            if (path === '/auth/signin') { account = body.id; return { data: { id: account } }; }
            if (path === '/carts/create') database.set(account, body.map(item => ({ ...product, ...item })));
            return { data: {} };
        },
        async get() { return { data: { products: database.get(account), totalPrice: 5, cartId: account } }; }
    };
    const context = vm.createContext({ console, localStorage: {
        setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key)
    }});
    const module = new vm.SourceTextModule(await readFile(new URL('../src/store/actions/index.js', import.meta.url), 'utf8'), { context });
    await module.link(specifier => new vm.SyntheticModule(['default'], function () {
        this.setExport('default', specifier.includes('api') ? api : toast);
    }, { context }));
    await module.evaluate();
    let state = { auth: { user: { id: 1 } }, carts: cartReducer(undefined, {}), payment: { paymentMethod: 'Stripe' } };
    const dispatch = action => {
        if (typeof action === 'function') return action(dispatch, () => state);
        state = { auth: authReducer(state.auth, action), carts: cartReducer(state.carts, action), payment: paymentMethodReducer(state.payment, action) };
    };
    return { actions: module.namespace, api, dispatch, state: () => state, storage, errors, toast, database, calls };
}

test('save, logout, switch accounts, restore original cart', async () => {
    const t = await setup();
    await t.dispatch(t.actions.addToCart(product, 1, t.toast));
    assert.equal(t.database.get(1)[0].quantity, 1);
    for (const key of ['auth', 'CHECKOUT_ADDRESS', 'client-secret']) t.storage.set(key, 'old');
    await t.dispatch(t.actions.logOutUser(() => {}));
    assert.equal(t.calls.at(-1), '/auth/signout');
    assert.equal(t.state().carts.cart.length, 0);
    assert.equal(t.state().carts.cartId, null);
    assert.equal(t.state().payment.paymentMethod, null);
    assert.equal(t.storage.size, 0);
    await t.dispatch(t.actions.authenticateSignInUser({ id: 2 }, t.toast, () => {}, () => {}, () => {}));
    assert.equal(t.state().carts.cart.length, 0);
    await t.dispatch(t.actions.logOutUser(() => {}));
    await t.dispatch(t.actions.authenticateSignInUser({ id: 1 }, t.toast, () => {}, () => {}, () => {}));
    assert.equal(t.state().carts.cart[0].productId, 10);
});

test('failed cart loading cancels login without overwriting the saved cart', async () => {
    const t = await setup();
    t.database.set(1, [product]);
    t.api.get = async () => { throw new Error('offline'); };
    let navigated = false;
    await t.dispatch(t.actions.authenticateSignInUser({ id: 1 }, t.toast, () => {}, () => { navigated = true; }, () => {}));
    assert.equal(t.state().auth.user, null);
    assert.equal(t.storage.has('auth'), false);
    assert.equal(navigated, false);
    assert.equal(t.database.get(1).length, 1);
    assert.equal(t.calls.at(-1), '/auth/signout');
});

test('quantity changes and removals persist', async () => {
    const t = await setup();
    await t.dispatch(t.actions.addToCart(product, 1, t.toast));
    await t.dispatch(t.actions.increaseCartQuantity(product, t.toast, 1, () => {}));
    assert.equal(t.database.get(1)[0].quantity, 2);
    await t.dispatch(t.actions.decreaseCartQuantity(product, 1));
    assert.equal(t.database.get(1)[0].quantity, 1);
    await t.dispatch(t.actions.removeFromCart(product, t.toast));
    assert.equal(t.database.get(1).length, 0);
});

test('failed save retains the current cart and cached quantity', async () => {
    const t = await setup();
    await t.dispatch(t.actions.addToCart(product, 1, t.toast));
    t.api.post = async () => { throw new Error('offline'); };
    const result = await t.dispatch(t.actions.decreaseCartQuantity(product, 2));
    assert.equal(result, false);
    assert.equal(t.state().carts.cart[0].quantity, 1);
    assert.equal(JSON.parse(t.storage.get('cartItems'))[0].quantity, 1);
    assert.equal(t.state().carts.isSaving, false);
});

test('failed signout reports failure and keeps the session available for retry', async () => {
    const t = await setup();
    t.api.post = async () => { throw new Error('offline'); };
    let navigated = false;
    await t.dispatch(t.actions.logOutUser(() => { navigated = true; }));
    assert.equal(navigated, false);
    assert.equal(t.state().auth.user.id, 1);
    assert.equal(t.errors.length, 1);
});

test('a cart response arriving after logout cannot restore the previous cart', async () => {
    const t = await setup();
    let resolve;
    t.api.get = () => new Promise(done => { resolve = done; });
    const loading = t.dispatch(t.actions.getUserCart());
    await t.dispatch(t.actions.logOutUser(() => {}));
    resolve({ data: { products: [product] } });
    assert.equal(await loading, false);
    assert.equal(t.state().carts.cart.length, 0);
    assert.equal(t.storage.has('cartItems'), false);
});


test('guest merge adds quantities and preserves only guest selection', async () => {
    const t = await setup();
    t.dispatch({ type: 'LOG_OUT' });
    await t.dispatch(t.actions.addToCart(product, 2, t.toast));
    const other = { ...product, productId: 20 };
    t.database.set(1, [{ ...product, quantity: 1 }, { ...other, quantity: 1 }]);
    let destination;
    await t.dispatch(t.actions.authenticateSignInUser({ id: 1 }, t.toast, () => {}, path => { destination = path; }, () => {}, true));
    assert.equal(destination, '/cart');
    assert.equal(t.state().carts.cart[0].quantity, 3);
    assert.equal(t.state().carts.cart.length, 2);
    assert.deepEqual(Array.from(t.state().carts.selectedIds), [10]);
    assert.equal(t.database.get(1)[0].quantity, 3);
});

test('registration keeps checkout destination', async () => {
    const t = await setup();
    let destination;
    await t.dispatch(t.actions.registerNewUser({}, t.toast, () => {}, path => { destination = path; }, () => {}, true));
    assert.equal(destination, '/login?checkout=1');
});


test('changing checkout address clears the old Stripe secret', async () => {
    const t = await setup();
    t.dispatch({ type: 'CLIENT_SECRET', payload: 'old-secret' });
    t.storage.set('client-secret', 'old-secret');
    t.dispatch(t.actions.selectUserCheckoutAddress({ addressId: 2 }));
    assert.equal(t.state().auth.clientSecret, null);
    assert.equal(t.storage.has('client-secret'), false);
});

test('a delayed Stripe response cannot replace the changed checkout', async () => {
    const t = await setup();
    let resolve;
    t.api.post = () => new Promise(done => { resolve = done; });
    const loading = t.dispatch(t.actions.createStripePaymentSecret({}, t.toast));
    t.dispatch(t.actions.selectUserCheckoutAddress({ addressId: 2 }));
    resolve({ data: 'stale-secret' });
    await loading;
    assert.equal(t.state().auth.clientSecret, null);
    assert.equal(t.storage.has('client-secret'), false);
});


test('paid stock shortage preserves cart selection and returns the attention order', async () => {
    const t = await setup();
    await t.dispatch(t.actions.addToCart(product, 1, t.toast));
    t.dispatch(t.actions.selectCartItems([10]));
    t.api.post = async () => ({ data: { orderId: 42, orderStatus: 'Paid, needs attention' } });
    let error = ''; let loading;
    const result = await t.dispatch(t.actions.stripePaymentConfirmation({}, value => error = value, value => loading = value, t.toast));
    assert.equal(result.orderId, 42);
    assert.equal(result.orderStatus, 'Paid, needs attention');
    assert.equal(t.state().carts.cart[0].quantity, 1);
    assert.equal(t.state().carts.selectedIds[0], 10);
    assert.equal(error, ''); assert.equal(loading, false);
});

test('successful order clears checkout selection after loading remaining cart', async () => {
    const t = await setup();
    t.dispatch(t.actions.selectCartItems([10]));
    t.api.post = async () => ({ data: { orderId: 43, orderStatus: 'Accepted !' } });
    const result = await t.dispatch(t.actions.stripePaymentConfirmation({}, () => {}, () => {}, t.toast));
    assert.equal(result.orderId, 43);
    assert.equal(t.state().carts.selectedIds.length, 0);
});
