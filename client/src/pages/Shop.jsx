import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiShoppingCart, FiX, FiPlus, FiMinus } from 'react-icons/fi';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const { user, refreshBalance } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/shop/products').then((res) => setProducts(res.data.products)).catch(() => {});
  }, []);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        return prev.map((c) => (c.productId === product.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, qty: 1 }];
    });
    toast.success(`${product.name} added to cart`);
  };

  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((c) => (c.productId === productId ? { ...c, qty: Math.max(1, c.qty + delta) } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const removeItem = (productId) => setCart((prev) => prev.filter((c) => c.productId !== productId));

  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  const checkout = async (method) => {
    if (!user) return navigate('/login');
    if (!cart.length) return toast.error('Your cart is empty');
    setCheckingOut(true);
    try {
      const items = cart.map((c) => ({ productId: c.productId, qty: c.qty }));
      if (method === 'wallet') {
        const res = await api.post('/shop/checkout/wallet', { items, address });
        toast.success(res.data.message);
        refreshBalance();
        setCart([]);
        setCartOpen(false);
        navigate('/dashboard/orders');
      } else {
        const res = await api.post('/shop/checkout/online/initialize', { items, address });
        window.location.href = res.data.authorization_url;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-14 relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl mb-1">Gadget Shop</h1>
          <p className="text-gray-500">Quality accessories, delivered fast.</p>
        </div>
        <button onClick={() => setCartOpen(true)} className="relative btn-primary flex items-center gap-2">
          <FiShoppingCart /> Cart
          {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-accent text-black text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{cart.length}</span>}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
        {products.map((p) => (
          <div key={p.id} className="card flex flex-col">
            <div className="h-32 bg-gray-100 rounded-xl mb-3 flex items-center justify-center text-3xl">📦</div>
            <h3 className="font-semibold text-sm mb-1">{p.name}</h3>
            <p className="text-xs text-gray-400 mb-2 line-clamp-2">{p.description}</p>
            <p className="text-primary font-bold mb-3">₦{p.price.toLocaleString()}</p>
            <button onClick={() => addToCart(p)} className="btn-outline mt-auto text-sm !py-2">Add to Cart</button>
          </div>
        ))}
      </div>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white w-full max-w-md h-full p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display font-bold text-xl">Your Cart</h2>
              <button onClick={() => setCartOpen(false)}><FiX size={22} /></button>
            </div>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center mt-10">Your cart is empty.</p>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cart.map((c) => (
                    <div key={c.productId} className="flex items-center justify-between border-b pb-3">
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-gray-400">₦{c.price.toLocaleString()} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(c.productId, -1)} className="p-1 border rounded"><FiMinus size={12} /></button>
                        <span className="text-sm w-5 text-center">{c.qty}</span>
                        <button onClick={() => updateQty(c.productId, 1)} className="p-1 border rounded"><FiPlus size={12} /></button>
                        <button onClick={() => removeItem(c.productId)} className="text-red-500 ml-2"><FiX size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="label">Delivery Address</label>
                  <textarea className="input-field mb-4" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter your delivery address" />
                </div>
                <div className="flex justify-between font-bold text-lg mb-4">
                  <span>Total</span>
                  <span>₦{total.toLocaleString()}</span>
                </div>
                <div className="space-y-2">
                  <button disabled={checkingOut} onClick={() => checkout('wallet')} className="btn-primary w-full">
                    {checkingOut ? 'Processing...' : 'Checkout with Wallet'}
                  </button>
                  <button disabled={checkingOut} onClick={() => checkout('online')} className="btn-outline w-full">
                    {checkingOut ? 'Processing...' : 'Pay Online (Card / Transfer / USSD)'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
