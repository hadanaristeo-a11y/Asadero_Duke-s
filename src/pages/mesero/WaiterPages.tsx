import { useState } from "react";

import {
  Plus,
  Minus,
  Trash2,
  Send,
  ShoppingBag,
  Clock3,
  CheckCircle2,
  CreditCard,
  Banknote,
  Smartphone,
} from "lucide-react";

import {
  Card,
  Button,
  PageTitle,
  SearchBox,
  StatusBadge,
} from "../../components/ui/Primitives";

import { money, type OrderItem } from "../../data/demo";

import { getProducts } from "../../api/productos.api";
import { createOrder, getOrders, payOrder, type OrderRecord } from "../../api/order.api";
import { useApiResource } from "../../hooks/useApiResource";
import { apiMessage } from "../../api/client";

// ======================================================
// PANEL PRINCIPAL DEL MESERO
// ======================================================

export function WaiterDashboard() {
  const { data: orders, error } = useApiResource(getOrders, [] as OrderRecord[]);
  const mine = orders;

  const pedidosEnCurso = orders.filter(
    (order) =>
      order.status === "Pendiente" ||
      order.status === "En preparación",
  ).length;

  const pedidosListos = orders.filter(
    (order) => order.status === "Listo",
  ).length;

  return (
    <>
      <PageTitle
        title="¡Hola, bienvenido!"
        subtitle="Aquí puedes gestionar tus pedidos para llevar."
      />
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            label: "Pedidos en curso",
            value: pedidosEnCurso,
            icon: ShoppingBag,
          },
          {
            label: "Pedidos listos",
            value: pedidosListos,
            icon: CheckCircle2,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.label} className="p-5">
              <div className="flex items-center justify-between text-sm text-slate-500">
                {item.label}

                <Icon size={20} className="text-red-800" />
              </div>

              <p className="mt-3 text-3xl font-bold">
                {item.value}
              </p>
            </Card>
          );
        })}
      </div>

      <div className="mt-6">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">
              Mis pedidos recientes
            </h2>

            <span className="text-xs text-slate-500">
              Últimos pedidos registrados
            </span>
          </div>

          <div className="space-y-3">
            {(mine.length ? mine : orders)
              .slice(0, 5)
              .map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-3 border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="font-semibold">
                      Pedido #{order.id}
                    </p>

                    <p className="text-xs text-slate-500">
                      {order.tipoPedido} · {order.createdAt}
                    </p>
                  </div>

                  <StatusBadge status={order.status} />
                </div>
              ))}
          </div>

          {orders.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">
              Todavía no hay pedidos registrados.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}

// ======================================================
// CREAR NUEVO PEDIDO
// ======================================================

export function NewOrderPage() {
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const { data: products, loading, error } = useApiResource(getProducts, []);

  const categories = [
    "Todos",
    ...Array.from(
      new Set(products.map((product) => product.category)),
    ),
  ];

  const filtered = products.filter(
    (product) =>
      (category === "Todos" || product.category === category) &&
      product.name.toLowerCase().includes(search.toLowerCase()) &&
      product.active,
  );

  // AGREGAR PRODUCTOS AL PEDIDO

  const add = (product: (typeof products)[number]) => {
    setCart((old) => {
      const found = old.find(
        (item) => item.productId === product.id,
      );

      if (found) {
        return old.map((item) =>
          item.productId === product.id
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }

      return [
        ...old,
        {
          productId: product.id,
          name: product.name,
          qty: 1,
          price: product.price,
        },
      ];
    });

    setNotice("");
  };

  // MODIFICAR CANTIDADES

  const change = (id: number, delta: number) => {
    setCart((old) =>
      old
        .map((item) =>
          item.productId === id
            ? { ...item, qty: item.qty + delta }
            : item,
        )
        .filter((item) => item.qty > 0),
    );

    setNotice("");
  };

  // CALCULAR TOTAL

  const total = cart.reduce(
    (sum, item) => sum + item.qty * item.price,
    0,
  );

  // REGISTRAR PEDIDO PARA LLEVAR

  const submit = async () => {
    if (cart.length === 0) {
      setNotice("Agrega al menos un producto.");
      return;
    }

    setSending(true);
    try {
      const created = await createOrder({ tipoPedido:"Para llevar", observaciones:note.trim(), items:cart.map(item => ({ productId:item.productId, quantity:item.qty })) });
      setCart([]); setNote(""); setNotice(`Pedido #${created.id} enviado a cocina.`);
    } catch (error) { setNotice(apiMessage(error)); }
    finally { setSending(false); }
  };

  return (
    <>
      <PageTitle
        title="Nuevo pedido"
        subtitle="Selecciona los productos para preparar un pedido para llevar."
      />
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="mb-4 text-sm text-slate-500">Cargando catálogo...</p>}

      {notice && (
        <div role="status" aria-live="polite" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,.9fr)]">
        {/* CATÁLOGO DE PRODUCTOS */}

        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                  category === item
                    ? "bg-red-800 text-white"
                    : "border bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Buscar producto..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden"
              >
                <img
                  src={product.imageUrl || "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80"}
                  alt={product.name}
                  className="h-36 w-full object-cover"
                />

                <div className="p-3">
                  <p className="font-semibold">
                    {product.name}
                  </p>

                  <p className="mt-1 text-sm font-bold text-red-800">
                    {money(product.price)}
                  </p>

                  <Button
                    className="mt-3 w-full"
                    onClick={() => add(product)}
                  >
                    <Plus size={16} />
                    Agregar
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {filtered.length === 0 && (
            <Card className="p-8 text-center text-sm text-slate-500">
              No se encontraron productos.
            </Card>
          )}
        </div>

        {/* RESUMEN DEL PEDIDO */}

        <Card className="p-5 xl:sticky xl:top-24">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              Pedido para llevar
            </h2>

            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-800">
              {cart.reduce((sum, item) => sum + item.qty, 0)} productos
            </span>
          </div>

          <div className="mt-4 max-h-[430px] space-y-3 overflow-auto">
            {cart.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                Aún no agregas productos.
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-3 border-b pb-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {item.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {money(item.price)} c/u
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        change(item.productId, -1)
                      }
                      className="rounded-md border p-1"
                      aria-label={`Quitar una unidad de ${item.name}`}
                    >
                      <Minus size={14} />
                    </button>

                    <span className="w-4 text-center text-sm">
                      {item.qty}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        change(item.productId, 1)
                      }
                      className="rounded-md border p-1"
                      aria-label={`Agregar una unidad de ${item.name}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <p className="w-20 text-right text-sm font-bold">
                    {money(item.price * item.qty)}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setCart((old) =>
                        old.filter(
                          (product) =>
                            product.productId !== item.productId,
                        ),
                      );
                      setNotice("");
                    }}
                    className="text-slate-400 hover:text-red-700"
                    aria-label={`Eliminar ${item.name} del pedido`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <label className="mt-4 block text-sm font-semibold">
            Observaciones

            <textarea
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              rows={2}
              className="mt-2 w-full rounded-xl border p-3 text-sm font-normal outline-none focus:border-red-400"
              placeholder="Ej. término medio, sin cebolla..."
            />
          </label>

          <div className="mt-4 border-t pt-4">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>{money(total)}</span>
            </div>

            <div className="mt-2 flex justify-between text-sm text-slate-500">
              <span>IVA incluido (referencia)</span>
              <span>{money(0)}</span>
            </div>

            <div className="mt-3 flex justify-between text-lg font-bold">
              <span>Total</span>

              <span className="text-red-800">
                {money(total)}
              </span>
            </div>
          </div>

          <Button
            className="mt-5 w-full py-3"
            onClick={submit}
            disabled={sending}
          >
            <Send size={17} />
            {sending ? "Enviando..." : "Enviar a cocina"}
          </Button>

          <Button
            variant="secondary"
            className="mt-2 w-full"
            onClick={() => {
              setCart([]);
              setNote("");
              setNotice("Pedido limpiado.");
            }}
          >
            Limpiar pedido
          </Button>
        </Card>
      </div>
    </>
  );
}

// ======================================================
// MIS PEDIDOS
// ======================================================

export function MyOrdersPage() {
  const { data: orders, error } = useApiResource(getOrders, [] as OrderRecord[]);
  const [search, setSearch] = useState("");

  const filtered = orders.filter((order) =>
    `${order.id} ${order.status}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <>
      <PageTitle
        title="Mis pedidos"
        subtitle="Consulta el estado de los pedidos para llevar."
      />
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mb-4">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Buscar por número o estado..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((order) => (
          <Card key={order.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500">
                  {order.tipoPedido}
                </p>

                <h2 className="text-xl font-bold">
                  #{order.id}
                </h2>
              </div>

              <StatusBadge status={order.status} />
            </div>

            <div className="mt-3 flex justify-end text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Clock3 size={14} />
                {order.createdAt}
              </span>
            </div>

            <div className="my-4 space-y-2 border-y py-3">
              {order.items.map((item) => (
                <div
                  key={item.productId}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span>
                    {item.qty} × {item.name}
                  </span>

                  <span>
                    {money(item.qty * item.price)}
                  </span>
                </div>
              ))}
            </div>

            {order.note && (
              <p className="mb-3 text-xs text-slate-500">
                Nota: {order.note}
              </p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Total
              </span>

              <span className="text-lg font-bold">
                  {money(order.total)}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="p-10 text-center text-slate-500">
          No hay pedidos que coincidan.
        </Card>
      )}
    </>
  );
}

// ======================================================
// COBRAR PEDIDO
// ======================================================

export function ChargeOrderPage() {
  const { data: orders, setData: setOrders, loading, error } = useApiResource(getOrders, [] as OrderRecord[]);
  const [selected, setSelected] = useState("");

  const [method, setMethod] = useState("Efectivo");
  const [received, setReceived] = useState("");
  const [notice, setNotice] = useState("");

  const resolvedSelected = selected || String(orders.find(order => order.status === "Entregado")?.id || "");
  const order = orders.find(item => String(item.id) === resolvedSelected);

  const total = order
    ? order.items.reduce(
        (sum, item) => sum + item.qty * item.price,
        0,
      )
      : 0;

  const change = Number(received || 0) - total;

  // REGISTRAR EL COBRO

  const pay = async () => {
    if (!order) {
      setNotice("Selecciona un pedido.");
      return;
    }

    if (order.status === "Pagado") {
      setNotice("Este pedido ya está pagado.");
      return;
    }

    if (
      method === "Efectivo" &&
      Number(received) < total
    ) {
      setNotice("El monto recibido no cubre el total.");
      return;
    }

    try {
      await payOrder(order.id, { metodoPago:method as "Efectivo"|"Tarjeta"|"Transferencia", ...(method === "Efectivo" ? {montoRecibido:Number(received)} : {}) });
      setOrders(old => old.map(item => item.id === order.id ? {...item,status:"Pagado"} : item));
      setSelected("");
      setNotice(`Pago del pedido #${order.id} registrado correctamente.`);
    } catch (error) { setNotice(apiMessage(error)); }
  };

  return (
    <>
      <PageTitle
        title="Cobrar pedido"
        subtitle="Selecciona un pedido para llevar y registra el método de pago."
      />
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="mb-4 text-sm text-slate-500">Cargando pedidos...</p>}

      <div className="grid items-start gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="p-5">
          <h2 className="font-bold">
            Seleccionar pedido
          </h2>

          <label htmlFor="order-to-charge" className="sr-only">Pedido a cobrar</label>
          <select
            id="order-to-charge"
            value={resolvedSelected}
            onChange={(event) => {
              setSelected(event.target.value);
              setNotice("");
              setReceived("");
            }}
            className="mt-3 w-full rounded-xl border p-3"
          >
            <option value="">
              Selecciona un pedido
            </option>

            {orders
              .filter(item => item.status === "Entregado")
              .map((item) => (
                <option key={item.id} value={item.id}>
                  Pedido #{item.id} · {item.tipoPedido} · {money(item.total)}
                </option>
              ))}
          </select>

          {order ? (
            <>
              <div className="mt-5 space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex justify-between border-b pb-3 text-sm"
                  >
                    <span>
                      {item.qty} × {item.name}
                    </span>

                    <span>
                      {money(item.qty * item.price)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-between text-xl font-bold">
                <span>Total a pagar</span>

                <span className="text-red-800">
              {money(total)}
                </span>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No hay pedidos pendientes de cobro.
            </p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-bold">
            Método de pago
          </h2>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { name: "Efectivo", icon: Banknote },
              { name: "Tarjeta", icon: CreditCard },
              { name: "Transferencia", icon: Smartphone },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <button
                  type="button"
                  key={item.name}
                  onClick={() => {
                    setMethod(item.name);
                    setNotice("");
                  }}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-semibold ${
                    method === item.name
                      ? "border-red-700 bg-red-50 text-red-800"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  <Icon size={22} />
                  {item.name}
                </button>
              );
            })}
          </div>

          <label className="mt-5 block text-sm font-medium">
            Monto recibido
            {method === "Efectivo" ? "" : " (opcional)"}

            <input
              type="number"
              min="0"
              value={received}
              onChange={(event) =>
                setReceived(event.target.value)
              }
              placeholder={
                method === "Efectivo"
                  ? "Ej. 500"
                  : "Monto recibido"
              }
              className="mt-2 w-full rounded-xl border p-3 text-lg outline-none focus:border-red-400"
            />
          </label>

          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>

            <div className="mt-2 flex justify-between font-semibold">
              <span>
                {method === "Efectivo"
                  ? "Cambio"
                  : "Diferencia estimada"}
              </span>

              <span
                className={
                  change < 0
                    ? "text-red-700"
                    : "text-emerald-700"
                }
              >
                {money(Math.max(0, change))}
              </span>
            </div>
          </div>

          {notice && (
            <p role="status" aria-live="polite" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              {notice}
            </p>
          )}

          <Button
            className="mt-5 w-full py-3"
            onClick={pay}
          >
            <CheckCircle2 size={17} />
            Confirmar cobro
          </Button>

          <p className="mt-3 text-xs text-slate-400">
            El registro se guarda en la base de datos; no procesa pagos bancarios.
          </p>
        </Card>
      </div>
    </>
  );
}
