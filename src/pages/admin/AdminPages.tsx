import { useState } from "react";
import {
  Plus,
  Download,
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  TrendingUp,
} from "lucide-react";

import {
  Card,
  Button,
  PageTitle,
  SearchBox,
  StatusBadge,
} from "../../components/ui/Primitives";

import {
  money,
  type Product,
} from "../../data/demo";
import { getProducts, createProduct, updateProduct, getCategories, createCategory, updateCategory, type ProductRecord } from "../../api/productos.api";
import { createUser, getUsers, updateUserState } from "../../api/users.api";
import { getOrders, type OrderRecord } from "../../api/order.api";
import { closeCashCut, getCurrentCashCut, openCashCut } from "../../api/cashCuts.api";
import { useApiResource } from "../../hooks/useApiResource";
import { apiMessage } from "../../api/client";

export function AdminDashboard() {
  const { data: current, error: ordersError } = useApiResource(getOrders, [] as OrderRecord[]);
  const { data: users, error: usersError } = useApiResource(getUsers, []);
  const { data: products, error: productsError } = useApiResource(getProducts, []);
  const errors = [ordersError, usersError, productsError].filter(Boolean);
  const total = current.filter(o => o.status === "Pagado").reduce((sum, o) => sum + o.total, 0);

  const stats = [
    {
      label: "Ventas registradas",
      value: money(total),
      icon: DollarSign,
      color: "bg-red-100 text-red-700",
    },
    {
      label: "Pedidos del sistema",
      value: String(current.length),
      icon: ShoppingBag,
      color: "bg-orange-100 text-orange-700",
    },
    {
      label: "Usuarios activos",
      value: String(users.filter(user => user.active).length),
      icon: Users,
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Productos activos",
      value: String(products.filter((p) => p.active).length),
      icon: Package,
      color: "bg-violet-100 text-violet-700",
    },
  ];

  return (
    <>
      <PageTitle
        title="Resumen general"
        subtitle="Bienvenido al panel de control de Asadero Duke's."
      />

      {errors.length > 0 && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">No se pudieron cargar todos los datos del servidor: {errors.join(" · ")}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;

          return (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  {s.label}
                </span>

                <span className={`rounded-xl p-3 ${s.color}`}>
                  <Icon size={20} />
                </span>
              </div>

              <div className="mt-3 text-2xl font-bold">
                {s.value}
              </div>

              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
                <TrendingUp size={13} />
                Datos conectados al servidor
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="min-w-0 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Pedidos recientes</h2>
            <span className="text-xs text-slate-500">
              Últimos pedidos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b text-xs text-slate-500">
                <tr>
                  <th className="pb-3">Pedido</th>
                  <th>Tipo de pedido</th>
                  <th>Mesero</th>
                  <th>Estado</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>

              <tbody>
                {current.slice(0, 5).map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-4 font-semibold">
                      #{o.id}
                    </td>

                    <td>{o.tipoPedido}</td>

                    <td>{o.waiter}</td>

                    <td>
                      <StatusBadge status={o.status} />
                    </td>

                    <td className="text-right">
                      {money(o.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-bold">Accesos rápidos</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              {
                label: "Productos",
                icon: Package,
                to: "/admin/productos",
              },
              {
                label: "Usuarios",
                icon: Users,
                to: "/admin/usuarios",
              },
              {
                label: "Corte de caja",
                icon: DollarSign,
                to: "/admin/corte-caja",
              },
              {
                label: "Pedidos para llevar",
                icon: ShoppingBag,
                to: "/admin/pedidos",
              },
            ].map((a) => {
              const Icon = a.icon;

              return (
                <a
                  key={a.label}
                  href={a.to}
                  className="flex min-h-24 flex-col justify-between rounded-xl border border-slate-200 p-4 hover:border-red-300 hover:bg-red-50"
                >
                  <Icon size={22} className="text-red-800" />
                  <span className="text-sm font-semibold">
                    {a.label}
                  </span>
                </a>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}

export function ProductsPage() {
  const { data: remoteProducts, setData: setRemoteProducts, loading, error, reload } = useApiResource(getProducts, [] as ProductRecord[]);
  const { data: categories } = useApiResource(getCategories, []);
  const items: Product[] = remoteProducts.map(p => ({ id:p.id,name:p.name,category:p.category,price:Number(p.price),image:p.imageUrl || "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80",active:p.active }));

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("100");
  const [categoryId, setCategoryId] = useState(0);
  const [notice, setNotice] = useState("");

  const save = async () => {
    if (!name.trim() || Number(price) < 0 || !(categoryId || categories[0]?.id)) return;
    try {
      await createProduct({ name:name.trim(), price:Number(price), categoryId:categoryId || categories[0].id, active:true });
      reload(); setName(""); setShowForm(false); setNotice("Producto agregado correctamente.");
    } catch (error) { setNotice(apiMessage(error)); }
  };

  const toggle = async (id: number) => {
    const product = remoteProducts.find(p => p.id === id);
    if (!product) return;
    try {
      await updateProduct(id, { name:product.name, description:product.description, imageUrl:product.imageUrl, price:Number(product.price), categoryId:product.categoryId, active:!product.active });
      setRemoteProducts(old => old.map(p => p.id === id ? {...p,active:!p.active} : p));
    } catch (error) { setNotice(apiMessage(error)); }
  };

  const filtered = items.filter((p) =>
    `${p.name} ${p.category}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <>
      <PageTitle
        title="Catálogo de productos"
        subtitle="Administra los productos disponibles para los pedidos."
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus size={17} />
            Nuevo producto
          </Button>
        }
      />

      {notice && (
        <p role="status" aria-live="polite" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      {showForm && (
        <Card className="mb-5 p-5">
          <h2 className="mb-4 font-bold">Registrar producto</h2>

          <div className="grid gap-3 md:grid-cols-4">
            <label htmlFor="product-name" className="sr-only">Nombre del producto</label>
            <input
              id="product-name"
              className="rounded-lg border p-3 text-sm"
              placeholder="Nombre del producto"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label htmlFor="product-price" className="sr-only">Precio</label>
            <input
              id="product-price"
              className="rounded-lg border p-3 text-sm"
              type="number"
              min="1"
              placeholder="Precio"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />

            <label htmlFor="product-category" className="sr-only">Categoría</label>
            <select
              id="product-category"
              className="rounded-lg border p-3 text-sm"
              value={categoryId || categories[0]?.id || ""}
              onChange={(e) => setCategoryId(Number(e.target.value))}
            >
              {categories.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <Button onClick={save}>Guardar producto</Button>
          </div>
        </Card>
      )}

      <div className="mb-5 flex flex-wrap gap-3">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Buscar producto o categoría..."
        />

        <span className="self-center text-sm text-slate-500">
          {filtered.length} productos
        </span>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="mb-4 text-sm text-slate-500">Cargando productos...</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <img
              src={p.image}
              alt={p.name}
              className="h-40 w-full object-cover"
              loading="lazy"
            />

            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold">{p.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {p.category}
                  </p>
                </div>

                <StatusBadge status={p.active ? "Activo" : "Inactivo"} />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-bold text-red-800">
                  {money(p.price)}
                </span>

                <Button
                  variant={p.active ? "danger" : "success"}
                  onClick={() => toggle(p.id)}
                >
                  {p.active ? "Desactivar" : "Activar"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export function CategoriesPage() {
  const { data: cats, reload, error } = useApiResource(getCategories, []);

  const [value, setValue] = useState("");

  const add = async () => {
    if (!value.trim() || cats.some(category => category.name.toLowerCase() === value.trim().toLowerCase())) return;
    try { await createCategory(value.trim()); setValue(""); reload(); }
    catch (error) { window.alert(apiMessage(error)); }
  };

  return (
    <>
      <PageTitle
        title="Categorías"
        subtitle="Organiza los productos del catálogo."
      />

      <Card className="p-5">
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mb-5 flex flex-wrap gap-3">
          <label htmlFor="new-category" className="sr-only">Nueva categoría</label>
          <input
            id="new-category"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Nueva categoría..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />

          <Button onClick={add}>
            <Plus size={17} />
            Agregar categoría
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border p-4"
            >
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {c.active ? "Activa" : "Inactiva"}
                </p>
              </div>

              <Button
                variant="danger"
                onClick={async () => { try { await updateCategory(c.id, !c.active); reload(); } catch (error) { window.alert(apiMessage(error)); } }}
              >
                {c.active ? "Desactivar" : "Activar"}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

export function UsersPage() {
  const { data: users, reload, error } = useApiResource(getUsers, []);

  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Mesero");

  const add = async () => {
    if (!name.trim() || !username.trim() || password.length < 8) return;
    const roleMap: Record<string,"admin"|"mesero"|"cocina"> = { Administrador:"admin", Mesero:"mesero", Cocina:"cocina" };
    try { await createUser({ name:name.trim(), username:username.trim(), password, role:roleMap[role] }); setName(""); setUsername(""); setPassword(""); setShow(false); reload(); }
    catch (error) { window.alert(apiMessage(error)); }
  };

  const filtered = users.filter(
    (u: { name: string; username: string; role: string }) =>
      `${u.name} ${u.username} ${u.role}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  return (
    <>
      <PageTitle
        title="Administrar usuarios"
        subtitle="Registra al personal y asigna un rol."
        action={
          <Button onClick={() => setShow(!show)}>
            <Plus size={17} />
            Nuevo usuario
          </Button>
        }
      />

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {show && (
        <Card className="mb-5 p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <label htmlFor="user-name" className="sr-only">Nombre completo</label>
            <input
              id="user-name"
              className="rounded-lg border p-3"
              placeholder="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label htmlFor="user-username" className="sr-only">Usuario</label>
            <input
              id="user-username"
              className="rounded-lg border p-3"
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <label htmlFor="user-password" className="sr-only">Contraseña inicial</label>
            <input id="user-password" type="password" minLength={8} autoComplete="new-password" className="rounded-lg border p-3" placeholder="Contraseña inicial" value={password} onChange={e => setPassword(e.target.value)} />

            <label htmlFor="user-role" className="sr-only">Rol</label>
            <select
              id="user-role"
              className="rounded-lg border p-3"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option>Administrador</option>
              <option>Mesero</option>
              <option>Cocina</option>
            </select>

            <Button onClick={add}>Guardar usuario</Button>
          </div>
        </Card>
      )}

      <div className="mb-4">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Buscar usuario..."
        />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {["Nombre", "Usuario", "Rol", "Estado", "Acciones"].map(
                (h) => (
                  <th key={h} className="px-5 py-4">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>

          <tbody>
            {filtered.map(
              (u: {
                id: number;
                name: string;
                username: string;
                role: string;
                active: boolean;
              }) => (
                <tr key={u.id} className="border-t">
                  <td className="px-5 py-4 font-semibold">
                    {u.name}
                  </td>

                  <td className="px-5 py-4">{u.username}</td>
                  <td className="px-5 py-4">{{admin:"Administrador",mesero:"Mesero",cocina:"Cocina",cajero:"Cajero"}[u.role] || u.role}</td>

                  <td className="px-5 py-4">
                    <StatusBadge status={u.active ? "Activo" : "Inactivo"} />
                  </td>

                  <td className="px-5 py-4">
                    <Button
                      variant={u.active ? "danger" : "success"}
                      onClick={async () => { try { await updateUserState(u.id, !u.active); reload(); } catch (error) { window.alert(apiMessage(error)); } }}
                    >
                      {u.active ? "Desactivar" : "Activar"}
                    </Button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export function OrdersAdminPage() {
  const { data: orders, error } = useApiResource(getOrders, [] as OrderRecord[]);

  const [search, setSearch] = useState("");

  const filtered = orders.filter((o) =>
    `${o.id} ${o.waiter} ${o.status}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <>
      <PageTitle
        title="Gestión de pedidos"
        subtitle="Consulta los pedidos para llevar y su estado."
      />

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mb-4">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Buscar por pedido o mesero..."
        />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {[
                "Pedido",
                "Tipo de pedido",
                "Mesero",
                "Hora",
                "Productos",
                "Estado",
                "Total",
              ].map((x) => (
                <th key={x} className="px-4 py-4">
                  {x}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-4 font-bold">
                  #{o.id}
                </td>

                <td className="px-4 py-4">{o.tipoPedido}{o.numeroMesa ? ` · Mesa ${o.numeroMesa}` : ""}</td>

                <td className="px-4 py-4">{o.waiter}</td>

                <td className="px-4 py-4">{o.createdAt}</td>

                <td className="px-4 py-4">
                  {o.items.reduce((s, i) => s + i.qty, 0)}
                </td>

                <td className="px-4 py-4">
                  <StatusBadge status={o.status} />
                </td>

                <td className="px-4 py-4">
                  {money(o.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export function CashCutPage() {
  const { data: orders, error: ordersError } = useApiResource(getOrders, [] as OrderRecord[])
  const { data: cut, error: cutError, loading, reload } = useApiResource(getCurrentCashCut, null)
  const [opening, setOpening] = useState('500')
  const [counted, setCounted] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const paid = orders.filter(order => order.status === 'Pagado')
  const pending = orders.filter(order => order.status !== 'Pagado' && order.status !== 'Entregado')

  const startCut = async () => {
    const amount = Number(opening)
    if (!Number.isFinite(amount) || amount < 0) { setNotice('El fondo inicial debe ser un monto v?lido.'); return }
    setBusy(true); setNotice('')
    try { await openCashCut(amount); reload(); setNotice('Corte de caja abierto y guardado.') }
    catch (error) { setNotice(apiMessage(error)) }
    finally { setBusy(false) }
  }

  const finishCut = async () => {
    const amount = Number(counted)
    if (!cut || !Number.isFinite(amount) || amount < 0) { setNotice('Ingresa el efectivo contado para cerrar el corte.'); return }
    setBusy(true); setNotice('')
    try { await closeCashCut(cut.id, amount); setCounted(''); reload(); setNotice('Corte cerrado y registrado en la base de datos.') }
    catch (error) { setNotice(apiMessage(error)) }
    finally { setBusy(false) }
  }

  return (
    <>
      <PageTitle title="Corte de caja" subtitle="Apertura, movimientos y cierre guardados en PostgreSQL."
        action={<Button onClick={() => window.print()}><Download size={17} />Imprimir corte</Button>} />
      {(ordersError || cutError) && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{ordersError || cutError}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{notice}</p>}

      {cut ? (
        <>
          <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-5">
            <div><p className="text-sm text-slate-500">Corte abierto #{cut.id}</p><p className="font-semibold">Apertura: {new Date(cut.openedAt).toLocaleString('es-MX')}</p></div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">En curso</span>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="p-5"><p className="text-sm text-slate-500">Fondo inicial</p><p className="mt-3 text-2xl font-bold">{money(cut.fondoInicial)}</p></Card>
            <Card className="p-5"><p className="text-sm text-slate-500">Efectivo</p><p className="mt-3 text-2xl font-bold">{money(cut.totalEfectivo)}</p></Card>
            <Card className="p-5"><p className="text-sm text-slate-500">Tarjeta y transferencia</p><p className="mt-3 text-2xl font-bold">{money(cut.totalTarjeta + cut.totalTransferencia)}</p></Card>
            <Card className="p-5"><p className="text-sm text-slate-500">Efectivo esperado</p><p className="mt-3 text-2xl font-bold">{money(cut.efectivoEsperado)}</p></Card>
          </div>
          <Card className="mt-6 p-5">
            <h2 className="font-bold">Cerrar corte</h2>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1"><label htmlFor="cash-counted" className="text-sm text-slate-500">Efectivo contado</label><input id="cash-counted" type="number" min="0" step="0.01" className="mt-2 w-full rounded-xl border p-3" value={counted} onChange={event => setCounted(event.target.value)} /></div>
              <Button onClick={finishCut} disabled={busy || loading}>{busy ? 'Guardando...' : 'Cerrar y guardar corte'}</Button>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-5">
          <h2 className="font-bold">Abrir turno</h2>
          <p className="mt-1 text-sm text-slate-500">Elige el fondo inicial para iniciar un corte en la base de datos.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1"><label htmlFor="cash-opening" className="text-sm text-slate-500">Fondo inicial</label><input id="cash-opening" type="number" min="0" step="0.01" className="mt-2 w-full rounded-xl border p-3 text-xl font-bold" value={opening} onChange={event => setOpening(event.target.value)} /></div>
            <Button onClick={startCut} disabled={busy || loading}>{busy ? 'Guardando...' : 'Abrir corte'}</Button>
          </div>
        </Card>
      )}

      <Card className="mt-6 p-5">
        <h2 className="font-bold">Resumen de pedidos</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Pedidos totales</p><p className="mt-2 text-xl font-bold">{orders.length}</p></div>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Pedidos pendientes</p><p className="mt-2 text-xl font-bold">{pending.length}</p></div>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Pagos registrados</p><p className="mt-2 text-xl font-bold">{paid.length}</p></div>
        </div>
      </Card>
    </>
  )
}

export function ReportsPage() {
  const { data: orders, error } = useApiResource(getOrders, [] as OrderRecord[]);

  const rows = [
    {
      label: "Pedidos registrados",
      value: String(orders.length),
    },
    {
      label: "Pendientes",
      value: String(
        orders.filter((o) => o.status === "Pendiente").length,
      ),
    },
    {
      label: "En preparación",
      value: String(
        orders.filter((o) => o.status === "En preparación").length,
      ),
    },
    {
      label: "Ventas estimadas de pedidos",
      value: money(
        orders.reduce(
          (s, o) =>
            s + o.total,
          0,
        ),
      ),
    },
  ];

  return (
    <>
      <PageTitle
        title="Reportes"
        subtitle="Indicadores generales de operación (datos de muestra)."
      />

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.label} className="p-6">
            <p className="text-sm text-slate-500">{r.label}</p>
            <p className="mt-3 text-2xl font-bold">{r.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-5">
        <h2 className="font-bold">Actividad reciente</h2>

        <div className="mt-4 space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between gap-3 border-b pb-3 last:border-0"
            >
              <div>
                <p className="font-semibold">
                  Pedido #{o.id} · {o.tipoPedido}
                </p>

                <p className="text-xs text-slate-500">
                  {o.createdAt} · {o.waiter}
                </p>
              </div>

              <StatusBadge status={o.status} />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
