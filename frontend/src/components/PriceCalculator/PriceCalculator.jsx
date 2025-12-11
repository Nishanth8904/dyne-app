// src/components/PriceCalculator/PriceCalculator.jsx
import { useState, useMemo } from "react";
import '../../Modal.css';
import styles from "./PriceCalculator.module.css";

function PriceCalculator({ restaurants = [] }) {
  // ---- restaurant & dish planner ----
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(
    restaurants[0]?.id ?? ""
  );

  const [rows, setRows] = useState([
    { id: 1, name: "", price: "", qty: 1 },
  ]);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: Date.now(), name: "", price: "", qty: 1 },
    ]);
  };

  const removeRow = (id) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  };

  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const estimatedTotal = useMemo(() => {
    return rows.reduce((sum, row) => {
      const price = Number(row.price) || 0;
      const qty = Number(row.qty) || 0;
      return sum + price * qty;
    }, 0);
  }, [rows]);

  const currentRestaurant =
    restaurants.find((r) => String(r.id) === String(selectedRestaurantId)) ||
    restaurants[0];

  // ---- split bill state ----
  const [people, setPeople] = useState("");
  const [taxPercent, setTaxPercent] = useState("");
  const [tipPercent, setTipPercent] = useState("");
  const [roundUp, setRoundUp] = useState(false);

  const totalBill = estimatedTotal;

  const { grandTotal, perPerson } = useMemo(() => {
    const base = totalBill || 0;
    const tax = Number(taxPercent) || 0;
    const tip = Number(tipPercent) || 0;
    const numPeople = Number(people) || 0;

    let withTax = base * (1 + tax / 100);
    let withTip = withTax * (1 + tip / 100);

    if (!numPeople) {
      return {
        grandTotal: withTip,
        perPerson: 0,
      };
    }

    let rawPerPerson = withTip / numPeople;
    if (roundUp) {
      const rounded = Math.ceil(rawPerPerson);
      return {
        grandTotal: rounded * numPeople,
        perPerson: rounded,
      };
    }

    return {
      grandTotal: withTip,
      perPerson: rawPerPerson,
    };
  }, [totalBill, taxPercent, tipPercent, people, roundUp]);

  // ---- WhatsApp modal state (replaces prompt) ----
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waNumber, setWaNumber] = useState("");

  // open modal (was handleSendWhatsApp prompt)
  const handleSendWhatsApp = () => {
    if (!people || Number(people) <= 0) {
      // you can replace this with an inline UI error if you want
      alert("Add how many people are splitting the bill.");
      return;
    }
    setIsWaModalOpen(true);
  };

  // confirm send from modal
  const confirmWhatsAppSend = () => {
    const raw = (waNumber || "").trim();
    const phone = raw.replace(/\D/g, ""); // keep digits only
    if (!phone) {
      // simple guard — you can show UI feedback instead
      alert("Please enter a valid phone number (digits only, include country code).");
      return;
    }

    const lines = [];

    lines.push(`🍽 *Dyne – Split Bill*`);
    if (currentRestaurant?.name) {
      lines.push(`Restaurant: ${currentRestaurant.name}`);
    }
    lines.push("");

    if (rows.some((r) => r.name || r.price)) {
      lines.push("*Items:*");
      rows.forEach((row) => {
        if (!row.name && !row.price) return;
        const price = Number(row.price) || 0;
        const qty = Number(row.qty) || 0;
        const total = price * qty;
        lines.push(
          `• ${row.name || "Dish"} x${qty || 1} – ₹${total.toFixed(0)}`
        );
      });
      lines.push("");
    }

    lines.push(`Subtotal: ₹${totalBill.toFixed(0)}`);
    if (taxPercent) lines.push(`Tax: ${taxPercent}%`);
    if (tipPercent) lines.push(`Tip: ${tipPercent}%`);
    lines.push(
      `Grand total: *₹${grandTotal.toFixed(0)}* for ${people} people`
    );

    // perPerson might be float — round for messaging clarity
    lines.push(`Each pays: *₹${Math.round(perPerson)}*`);

    lines.push("");
    lines.push("Sent via Dyne Student Eats");

    const text = lines.join("\n");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

    window.open(url, "_blank");

    // clear modal state
    setIsWaModalOpen(false);
    setWaNumber("");
  };

  return (
    <section className={styles.section}>
      <div className={styles.card}>
        {/* ---------- HEADER ---------- */}
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Price planner & split bill</p>
            <h2 className={styles.title}>Plan the bill before you order</h2>
            <p className={styles.desc}>
              Add rough prices for each dish, see an estimated total, then split
              it with your group – including tax, tips and rounding.
            </p>
          </div>
        </header>

        {/* ---------- RESTAURANT SELECT ---------- */}
        <div className={styles.fieldBlock}>
          <label className={styles.fieldLabel}>Restaurant</label>
          <select
            className={styles.select}
            value={selectedRestaurantId}
            onChange={(e) => setSelectedRestaurantId(e.target.value)}
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} – {r.area}
              </option>
            ))}
          </select>
          {currentRestaurant && (
            <p className={styles.helperText}>
              {currentRestaurant.cuisine} • Avg ₹
              {currentRestaurant.avgCostForTwo || 0} for two
            </p>
          )}
        </div>

        {/* ---------- DISH TABLE ---------- */}
        <div className={styles.tableWrapper}>
          <div className={styles.tableHeaderRow}>
            <span className={styles.colDish}>Dish</span>
            <span className={styles.colPrice}>Price (₹)</span>
            <span className={styles.colQty}>Qty</span>
            <span className={styles.colTotal}>Total (₹)</span>
            <span className={styles.colActions} />
          </div>

          {rows.map((row) => {
            const price = Number(row.price) || 0;
            const qty = Number(row.qty) || 0;
            const rowTotal = price * qty;

            return (
              <div key={row.id} className={styles.tableRow}>
                <input
                  className={styles.dishInput}
                  placeholder="Ex: Chicken biryani"
                  value={row.name}
                  onChange={(e) =>
                    updateRow(row.id, "name", e.target.value)
                  }
                />
                <input
                  className={styles.priceInput}
                  type="number"
                  min="0"
                  value={row.price}
                  onChange={(e) =>
                    updateRow(row.id, "price", e.target.value)
                  }
                />
                <input
                  className={styles.qtyInput}
                  type="number"
                  min="1"
                  value={row.qty}
                  onChange={(e) =>
                    updateRow(row.id, "qty", e.target.value)
                  }
                />
                <div className={styles.totalCell}>₹{rowTotal.toFixed(0)}</div>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  title={
                    rows.length === 1 ? "Keep at least one dish" : "Remove dish"
                  }
                >
                  ×
                </button>
              </div>
            );
          })}

          <button
            type="button"
            className={styles.addRowBtn}
            onClick={addRow}
          >
            + Add dish
          </button>

          <div className={styles.estimateRow}>
            <span>Estimated total</span>
            <span className={styles.estimateAmount}>
              ₹{estimatedTotal.toFixed(0)}
            </span>
          </div>
          <p className={styles.tipText}>
            Tip: This is just a rough split to plan budgets – actual bill depends
            on tax, sides and drinks.
          </p>
        </div>

        {/* ---------- SPLIT BILL SECTION ---------- */}
        <div className={styles.splitHeaderRow}>
          <div>
            <h3 className={styles.splitTitle}>Split bill</h3>
            <p className={styles.splitSubtitle}>
              Use the estimated total above and see how much each friend pays.
            </p>
          </div>
        </div>

        <div className={styles.splitGrid}>
          <div className={styles.splitFieldGroup}>
            <label className={styles.fieldLabel}>Total bill (₹)</label>
            <input
              type="number"
              className={styles.splitInput}
              value={totalBill.toFixed(0)}
              readOnly
            />
            <p className={styles.helperText}>
              Automatically uses the estimated total from your dishes.
            </p>
          </div>

          <div className={styles.splitFieldGroup}>
            <label className={styles.fieldLabel}>Number of people</label>
            <input
              type="number"
              min="1"
              className={styles.splitInput}
              value={people}
              onChange={(e) => setPeople(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.splitGrid}>
          <div className={styles.splitFieldGroup}>
            <label className={styles.fieldLabel}>Tax %</label>
            <input
              type="number"
              min="0"
              className={styles.splitInput}
              placeholder="eg. 5"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
            />
          </div>
          <div className={styles.splitFieldGroup}>
            <label className={styles.fieldLabel}>Tip %</label>
            <input
              type="number"
              min="0"
              className={styles.splitInput}
              placeholder="eg. 5"
              value={tipPercent}
              onChange={(e) => setTipPercent(e.target.value)}
            />
          </div>
        </div>

        <label className={styles.roundRow}>
          <input
            type="checkbox"
            checked={roundUp}
            onChange={(e) => setRoundUp(e.target.checked)}
          />
          <span>Round up per person (clean whole numbers)</span>
        </label>

        {/* totals + share */}
        <div className={styles.totalsRow}>
          <div className={styles.totalBlock}>
            <span className={styles.totalLabel}>Grand total</span>
            <span className={styles.totalValue}>
              ₹{grandTotal.toFixed(0)}
            </span>
          </div>
          <div className={styles.totalBlock}>
            <span className={styles.totalLabel}>Per person</span>
            <span className={styles.totalValue}>
              ₹{perPerson.toFixed(0)}
            </span>
          </div>
          <button
            type="button"
            className={styles.whatsBtn}
            onClick={handleSendWhatsApp}
          >
            Send to WhatsApp
          </button>
        </div>
      </div>

      {/* ---------- WHATSAPP MODAL (in-app, replaces prompt) ---------- */}
      {isWaModalOpen && (
        <div className="dyne-modal-overlay">
          <div className="dyne-modal-card">
            <h3 className="dyne-modal-title">Send split bill to WhatsApp</h3>
            <p className="dyne-modal-subtitle">
              Enter your WhatsApp number with country code. Eg. <strong>91XXXXXXXXXX</strong>
            </p>

            <input
              className="dyne-modal-input"
              placeholder="91XXXXXXXXXX"
              value={waNumber}
              onChange={(e) => setWaNumber(e.target.value)}
            />

            <div className="dyne-modal-actions">
              <button
                className="dyne-modal-btn dyne-modal-btn-secondary"
                type="button"
                onClick={() => {
                  setIsWaModalOpen(false);
                  setWaNumber("");
                }}
              >
                Cancel
              </button>
              <button
                className="dyne-modal-btn dyne-modal-btn-primary"
                type="button"
                onClick={confirmWhatsAppSend}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default PriceCalculator;