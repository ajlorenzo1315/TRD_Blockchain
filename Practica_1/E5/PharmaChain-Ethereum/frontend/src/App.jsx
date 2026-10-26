import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { conectarContrato } from "./blockchain/contrato";
import "./App.css";

const shorten = (v = "") => (v ? `${v.slice(0, 7)}…${v.slice(-5)}` : "—");
const date = (s) => new Date(Number(s) * 1000).toLocaleString("es-ES");
const types = ["Registro", "Propuesta", "Aceptación", "Cancelación"];
const knownRoles = ["Administrador", "Laboratorio", "Distribuidor", "Farmacia"];
function errorText(e) {
    return e?.shortMessage || e?.reason || e?.message || "Operación fallida";
}

export default function App() {
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState("");
    const [roles, setRoles] = useState([]);
    const [section, setSection] = useState("inventario");
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState(null);
    const [medicine, setMedicine] = useState("");
    const [maker, setMaker] = useState("");
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("todos");
    const [items, setItems] = useState([]);
    const [selected, setSelected] = useState(null);
    const [movements, setMovements] = useState([]);
    const [pending, setPending] = useState(null);
    const [recipient, setRecipient] = useState("");
    const [directory, setDirectory] = useState({});
    const [newAddress, setNewAddress] = useState("");
    const [newLabel, setNewLabel] = useState("");

    const nameFor = useCallback(
        (addr) => {
            if (!addr || addr === ethers.ZeroAddress) return "Origen del registro";
            if (account && addr.toLowerCase() === account.toLowerCase()) return "Mi cuenta";
            return directory[addr.toLowerCase()] || shorten(addr);
        },
        [account, directory],
    );

    async function refresh(c = contract) {
        if (!c) return;
        const count = Number(await c.totalLotes());
        const result = await Promise.all(
            Array.from({ length: count }, (_, i) => c.consultarLote(i + 1)),
        );
        setItems(
            result.map((l) => ({
                id: Number(l.id),
                nombre: l.nombre,
                fabricante: l.fabricante,
                propietario: l.propietario,
                fecha: date(l.fechaRegistro),
                activo: l.activo,
            })),
        );
    }

    async function loadDetail(id, c = contract) {
        if (!c) return;
        const [l, t, n] = await Promise.all([
            c.consultarLote(id),
            c.transferencias(id),
            c.totalMovimientos(id),
        ]);
        const history = await Promise.all(
            Array.from({ length: Number(n) }, (_, i) => c.consultarMovimiento(id, i)),
        );
        setSelected({
            id: Number(l.id),
            nombre: l.nombre,
            fabricante: l.fabricante,
            propietario: l.propietario,
            fecha: date(l.fechaRegistro),
            activo: l.activo,
        });
        setPending({ origen: t.origen, destino: t.destino, pendiente: t.pendiente });
        setMovements(
            history.map((m, i) => ({
                key: i,
                tipo: types[Number(m.tipoMovimiento)] || "Movimiento",
                origen: m.origen,
                destino: m.destino,
                fecha: date(m.fecha),
            })),
        );
    }

    async function perform(task, success = "Operación completada") {
        setLoading(true);
        setNotice(null);
        try {
            await task();
            setNotice({ good: true, text: success });
        } catch (e) {
            setNotice({ good: false, text: errorText(e) });
        } finally {
            setLoading(false);
        }
    }
    async function connect() {
        await perform(async () => {
            const { contrato, cuenta } = await conectarContrato();
            const roleIds = await Promise.all([
                contrato.DEFAULT_ADMIN_ROLE(),
                contrato.LABORATORIO_ROLE(),
                contrato.DISTRIBUIDOR_ROLE(),
                contrato.FARMACIA_ROLE(),
            ]);
            const found = await Promise.all(roleIds.map((id) => contrato.hasRole(id, cuenta)));
            setRoles(knownRoles.filter((_, i) => found[i]));
            setContract(contrato);
            setAccount(cuenta);
            await refresh(contrato);
        }, "Cartera conectada y lotes actualizados");
    }
    async function transaction(make, success, after) {
        await perform(async () => {
            if (!contract) throw new Error("Conecta MetaMask primero");
            const tx = await make();
            setNotice({ good: true, text: "Esperando confirmación de Ethereum…" });
            await tx.wait();
            await refresh();
            if (after) await after();
        }, success);
    }
    async function register(e) {
        e.preventDefault();
        if (!medicine.trim() || !maker.trim())
            return setNotice({ good: false, text: "Completa el medicamento y el fabricante" });
        await transaction(
            () => contract.registrarLote(medicine.trim(), maker.trim()),
            "Medicamento registrado correctamente",
            async () => {
                setMedicine("");
                setMaker("");
                setSection("inventario");
            },
        );
    }
    async function choose(id) {
        await perform(() => loadDetail(id), `Lote #${id} cargado`);
    }
    async function act(action) {
        if (!selected) return;
        const id = selected.id;
        if (action === "proponer" && !ethers.isAddress(recipient))
            return setNotice({ good: false, text: "La dirección Ethereum no es válida" });
        const calls = {
            proponer: () => contract.proponerTransferencia(id, recipient),
            aceptar: () => contract.aceptarTransferencia(id),
            cancelar: () => contract.cancelarTransferencia(id),
            desactivar: () => contract.desactivarLote(id),
        };
        await transaction(calls[action], `Operación ${action} confirmada`, async () => {
            await loadDetail(id);
            if (action === "proponer") setRecipient("");
        });
    }
    function saveContact(e) {
        e.preventDefault();
        if (!ethers.isAddress(newAddress) || !newLabel.trim())
            return setNotice({ good: false, text: "Introduce una dirección y un nombre válidos" });
        setDirectory((old) => ({ ...old, [newAddress.toLowerCase()]: newLabel.trim() }));
        setNewAddress("");
        setNewLabel("");
        setNotice({
            good: true,
            text: "Alias añadido para esta sesión. No modifica la blockchain.",
        });
    }
    useEffect(() => {
        if (!window.ethereum) return;
        const onChange = () => {
            setContract(null);
            setAccount("");
            setRoles([]);
            setItems([]);
            setSelected(null);
            setNotice({ good: false, text: "La cuenta o red cambió. Vuelve a conectar." });
        };
        window.ethereum.on?.("accountsChanged", onChange);
        window.ethereum.on?.("chainChanged", onChange);
        return () => {
            window.ethereum.removeListener?.("accountsChanged", onChange);
            window.ethereum.removeListener?.("chainChanged", onChange);
        };
    }, []);
    const visible = useMemo(
        () =>
            items.filter(
                (l) =>
                    (filter === "todos" || (filter === "activos" ? l.activo : !l.activo)) &&
                    `${l.id} ${l.nombre} ${l.fabricante} ${l.propietario}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
            ),
        [items, query, filter],
    );
    const active = items.filter((l) => l.activo).length;
    const mine = items.filter(
        (l) => account && l.propietario.toLowerCase() === account.toLowerCase(),
    ).length;
    return (
        <div className="shell">
            <aside className="sidebar">
                <div className="brand">
                    <span className="brandmark">✚</span>
                    <span>
                        Pharma<span className="accent">Chain</span>
                        <small>ETHEREUM TRACEABILITY</small>
                    </span>
                </div>
                <div className="navtitle">ESPACIO DE TRABAJO</div>
                {[
                    ["inventario", "▦", "Inventario"],
                    ["registrar", "＋", "Registrar medicamento"],
                    ["directorio", "♧", "Identidades"],
                ].map(([key, icon, label]) => (
                    <button
                        key={key}
                        className={`navitem ${section === key ? "active" : ""}`}
                        onClick={() => setSection(key)}
                    >
                        <span>{icon}</span>
                        {label}
                    </button>
                ))}
                <div className="sidefoot">
                    <div className="dot" /> Red local · Hardhat <small>Chain ID 31337</small>
                </div>
            </aside>
            <main className="content">
                <div className="topbar">
                    <span>
                        Panel de trazabilidad <span className="crumb">/ {section}</span>
                    </span>
                    <button className="wallet" disabled={loading} onClick={connect}>
                        {account ? `● ${shorten(account)}` : "◈ Conectar MetaMask"}
                    </button>
                </div>
                {notice && (
                    <div role="status" className={`toast ${notice.good ? "ok" : "bad"}`}>
                        <span>{notice.good ? "✓" : "!"}</span>
                        <span>{notice.text}</span>
                        <button aria-label="Cerrar aviso" onClick={() => setNotice(null)}>
                            ×
                        </button>
                    </div>
                )}
                {section === "inventario" && (
                    <>
                        <div className="heading">
                            <div>
                                <div className="eyebrow">CONTROL Y SEGUIMIENTO</div>
                                <h1>Inventario farmacéutico</h1>
                                <p>
                                    Consulta la cadena de custodia de cada lote registrado en
                                    Ethereum.
                                </p>
                            </div>
                            <button className="primary" onClick={() => setSection("registrar")}>
                                ＋ Nuevo medicamento
                            </button>
                        </div>
                        <div className="stats">
                            <div className="stat">
                                <span>Total de lotes</span>
                                <strong>{items.length}</strong>
                                <small>Registrados en blockchain</small>
                            </div>
                            <div className="stat">
                                <span>Lotes activos</span>
                                <strong>{active}</strong>
                                <small>Disponibles para transferir</small>
                            </div>
                            <div className="stat">
                                <span>Bajo mi custodia</span>
                                <strong>{mine}</strong>
                                <small>Asociados a tu dirección</small>
                            </div>
                        </div>
                        <div className="panel">
                            <div className="panelhead">
                                <div>
                                    <h2>Medicamentos registrados</h2>
                                    <p>Selecciona un lote para ver su identidad e historial.</p>
                                </div>
                                <button
                                    className="outline"
                                    disabled={!contract || loading}
                                    onClick={() =>
                                        perform(() => refresh(), "Inventario actualizado")
                                    }
                                >
                                    ↻ Actualizar
                                </button>
                            </div>
                            <div className="toolbar">
                                <input
                                    aria-label="Buscar lotes"
                                    placeholder="⌕  Buscar medicamento, fabricante, dirección o ID..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                                <select
                                    aria-label="Filtrar lotes"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                >
                                    <option value="todos">Todos los estados</option>
                                    <option value="activos">Activos</option>
                                    <option value="inactivos">Inactivos</option>
                                </select>
                            </div>
                            <div className="tablewrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>LOTE</th>
                                            <th>MEDICAMENTO</th>
                                            <th>FABRICANTE</th>
                                            <th>CUSTODIO ACTUAL</th>
                                            <th>ESTADO</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visible.map((l) => (
                                            <tr key={l.id}>
                                                <td className="mono">
                                                    #{String(l.id).padStart(4, "0")}
                                                </td>
                                                <td>
                                                    <strong>{l.nombre}</strong>
                                                    <small>{l.fecha}</small>
                                                </td>
                                                <td>{l.fabricante}</td>
                                                <td>
                                                    <span title={l.propietario}>
                                                        {nameFor(l.propietario)}
                                                    </span>
                                                    <small className="mono">
                                                        {shorten(l.propietario)}
                                                    </small>
                                                </td>
                                                <td>
                                                    <span
                                                        className={`status ${l.activo ? "green" : "gray"}`}
                                                    >
                                                        ● {l.activo ? "Activo" : "Inactivo"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="linkbutton"
                                                        disabled={loading}
                                                        onClick={() => choose(l.id)}
                                                    >
                                                        Ver detalles →
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {visible.length === 0 && (
                                    <div className="empty">
                                        {contract
                                            ? "No hay lotes que coincidan con la búsqueda."
                                            : "Conecta MetaMask para consultar el inventario."}
                                    </div>
                                )}
                            </div>
                        </div>
                        {selected && (
                            <div className="panel detail">
                                <div className="panelhead">
                                    <div>
                                        <div className="eyebrow">
                                            FICHA DE TRAZABILIDAD · LOTE #{selected.id}
                                        </div>
                                        <h2>{selected.nombre}</h2>
                                    </div>
                                    <button className="outline" onClick={() => setSelected(null)}>
                                        Cerrar ×
                                    </button>
                                </div>
                                <div className="detailgrid">
                                    <div>
                                        <span className="fieldlabel">Fabricante declarado</span>
                                        <strong>{selected.fabricante}</strong>
                                    </div>
                                    <div>
                                        <span className="fieldlabel">Custodio actual</span>
                                        <strong>{nameFor(selected.propietario)}</strong>
                                        <code>{selected.propietario}</code>
                                    </div>
                                    <div>
                                        <span className="fieldlabel">Fecha de registro</span>
                                        <strong>{selected.fecha}</strong>
                                    </div>
                                    <div>
                                        <span className="fieldlabel">Estado</span>
                                        <strong>{selected.activo ? "Activo" : "Inactivo"}</strong>
                                    </div>
                                </div>
                                {pending?.pendiente && (
                                    <div className="pending">
                                        <strong>↗ Transferencia pendiente</strong>
                                        <p>
                                            De {nameFor(pending.origen)} a{" "}
                                            {nameFor(pending.destino)}
                                        </p>
                                        <code>{pending.destino}</code>
                                    </div>
                                )}
                                <div className="subhead">Gestionar transferencia</div>
                                <div className="actionrow">
                                    <input
                                        aria-label="Dirección del destinatario"
                                        placeholder="0x… Dirección Ethereum de destino"
                                        value={recipient}
                                        onChange={(e) => setRecipient(e.target.value)}
                                    />
                                    <button
                                        className="primary"
                                        disabled={
                                            loading ||
                                            !contract ||
                                            !selected.activo ||
                                            !!pending?.pendiente
                                        }
                                        onClick={() => act("proponer")}
                                    >
                                        Proponer
                                    </button>
                                    <button
                                        className="outline"
                                        disabled={loading || !pending?.pendiente}
                                        onClick={() => act("aceptar")}
                                    >
                                        Aceptar
                                    </button>
                                    <button
                                        className="outline"
                                        disabled={loading || !pending?.pendiente}
                                        onClick={() => act("cancelar")}
                                    >
                                        Cancelar
                                    </button>
                                    {roles.includes("Administrador") && (
                                        <button
                                            className="danger"
                                            disabled={loading || !selected.activo}
                                            onClick={() => {
                                                if (window.confirm("¿Desactivar este lote?"))
                                                    act("desactivar");
                                            }}
                                        >
                                            Desactivar
                                        </button>
                                    )}
                                </div>
                                <div className="subhead">
                                    Historial de custodia{" "}
                                    <span className="muted">({movements.length})</span>
                                </div>
                                <div className="timeline">
                                    {movements.map((m) => (
                                        <div className="event" key={m.key}>
                                            <div className="eventdot" />
                                            <div>
                                                <strong>{m.tipo}</strong>
                                                <span className="eventdate">{m.fecha}</span>
                                                <p>
                                                    {nameFor(m.origen)} → {nameFor(m.destino)}
                                                </p>
                                                <small title={`${m.origen} → ${m.destino}`}>
                                                    {shorten(m.origen)} → {shorten(m.destino)}
                                                </small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
                {section === "registrar" && (
                    <>
                        <div className="heading">
                            <div>
                                <div className="eyebrow">NUEVO REGISTRO</div>
                                <h1>Registrar medicamento</h1>
                                <p>Da de alta un lote de forma segura en la blockchain.</p>
                            </div>
                        </div>
                        <div className="formlayout">
                            <form className="panel formpanel" onSubmit={register}>
                                <h2>Información del lote</h2>
                                <p>
                                    Los datos introducidos se almacenarán públicamente en Ethereum.
                                </p>
                                <label htmlFor="medicine">
                                    Nombre del medicamento <b>*</b>
                                </label>
                                <input
                                    id="medicine"
                                    required
                                    maxLength={150}
                                    placeholder="Ej. Paracetamol 500 mg"
                                    value={medicine}
                                    onChange={(e) => setMedicine(e.target.value)}
                                />
                                <label htmlFor="maker">
                                    Nombre del fabricante <b>*</b>
                                </label>
                                <input
                                    id="maker"
                                    required
                                    maxLength={150}
                                    placeholder="Ej. Laboratorios Galicia"
                                    value={maker}
                                    onChange={(e) => setMaker(e.target.value)}
                                />
                                <div className="info">
                                    ⓘ El ID se genera automáticamente en el contrato. La dirección
                                    conectada será el custodio inicial.
                                </div>
                                <button
                                    type="submit"
                                    className="primary full"
                                    disabled={
                                        loading || !contract || !medicine.trim() || !maker.trim()
                                    }
                                >
                                    {loading
                                        ? "Confirmando transacción…"
                                        : "＋ Registrar lote en Ethereum"}
                                </button>
                            </form>
                            <div className="panel preview">
                                <div className="eyebrow">VISTA PREVIA</div>
                                <div className="medicineicon">✚</div>
                                <h2>{medicine || "Nombre del medicamento"}</h2>
                                <p>{maker || "Fabricante"}</p>
                                <div className="previewline">
                                    <span>Custodio inicial</span>
                                    <strong>{account ? shorten(account) : "Sin conectar"}</strong>
                                </div>
                                <div className="previewline">
                                    <span>Identificador</span>
                                    <strong>Automático</strong>
                                </div>
                                <div className="previewline">
                                    <span>Estado inicial</span>
                                    <span className="status green">● Activo</span>
                                </div>
                                <div className="previewfoot">
                                    El registro debe firmarlo una cuenta con rol Laboratorio.
                                </div>
                            </div>
                        </div>
                    </>
                )}
                {section === "directorio" && (
                    <>
                        <div className="heading">
                            <div>
                                <div className="eyebrow">IDENTIDADES</div>
                                <h1>Directorio de custodios</h1>
                                <p>
                                    Asigna nombres legibles a las direcciones para identificar quién
                                    custodia cada medicamento.
                                </p>
                            </div>
                        </div>
                        <div className="panel formpanel">
                            <h2>Identificar una dirección</h2>
                            <p>
                                Los alias solo se guardan durante esta sesión del navegador. No
                                modifican roles ni identidad verificada en Ethereum.
                            </p>
                            <form onSubmit={saveContact}>
                                <label>Nombre o entidad</label>
                                <input
                                    placeholder="Ej. Distribuidor Norte"
                                    value={newLabel}
                                    onChange={(e) => setNewLabel(e.target.value)}
                                />
                                <label>Dirección Ethereum</label>
                                <input
                                    placeholder="0x…"
                                    value={newAddress}
                                    onChange={(e) => setNewAddress(e.target.value)}
                                />
                                <button className="primary" type="submit">
                                    Guardar alias
                                </button>
                            </form>
                            <div className="subhead">Direcciones identificadas</div>
                            {Object.entries(directory).length ? (
                                Object.entries(directory).map(([address, label]) => (
                                    <div className="contact" key={address}>
                                        <strong>{label}</strong>
                                        <code>{address}</code>
                                        <button
                                            className="linkbutton"
                                            onClick={() =>
                                                setDirectory((d) => {
                                                    const next = { ...d };
                                                    delete next[address];
                                                    return next;
                                                })
                                            }
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="empty">
                                    Todavía no hay direcciones identificadas.
                                </div>
                            )}
                        </div>
                    </>
                )}
                <footer>
                    PharmaChain · Demostración académica · Ethereum local · Los datos on-chain son
                    públicos
                </footer>
            </main>
        </div>
    );
}
