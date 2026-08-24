import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { supabaseServer } from "@/lib/supabase/server";
import { TOIFALAR } from "@/lib/constants";
import { sanaKorinishi } from "@/lib/imtihonHisob";

// "Pechat" tugmasi — chiroyli formatlangan PDF, brauzerning yangi
// vkladkasida ochiladi (Content-Disposition: inline), o'sha yerdan
// (brauzer PDF ko'ruvchisining pechat tugmasi orqali) chop etiladi.
// Ustunlar Excel eksportidagi bilan bir xil g'oyada — "NATIJA" va
// "URINISH" ustunlari qog'ozda qo'lda to'ldirish uchun bo'sh qoldiriladi.
const URINISH_SELECT = `
  id, nazariy_kerak, amaliy_kerak,
  talabalar!inner(
    ism_familya, toifa,
    filiallar(nomi), guruhlar(nomi),
    nazariy_oqituvchilar:oqituvchilar!nazariy_oqituvchi_id(ism_familya)
  )
`;

const RANG = {
  brand: "#155e75",
  brandOchiq: "#ecfeff",
  chegara: "#cbd5e1",
  chegaraOchiq: "#e2e8f0",
  matn: "#1e293b",
  matnXira: "#64748b",
  zebraFon: "#f8fafc",
};

const stil = StyleSheet.create({
  bet: { padding: 28, fontSize: 9, color: RANG.matn, fontFamily: "Helvetica" },
  sarlavhaQatori: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: `2 solid ${RANG.brand}`,
    paddingBottom: 10,
    marginBottom: 14,
  },
  brend: { flexDirection: "row", alignItems: "center", gap: 6 },
  brendNoqta: { width: 8, height: 8, borderRadius: 4, backgroundColor: RANG.brand },
  brendMatn: { fontSize: 10, color: RANG.matnXira },
  sarlavha: { fontSize: 16, fontFamily: "Helvetica-Bold", color: RANG.brand, marginTop: 4 },
  izohMatni: { fontSize: 9, color: RANG.matnXira, marginTop: 2 },
  statBlok: { alignItems: "flex-end" },
  statSoni: { fontSize: 20, fontFamily: "Helvetica-Bold", color: RANG.brand },
  statLabel: { fontSize: 8, color: RANG.matnXira },

  jadval: { borderTop: `1 solid ${RANG.chegara}`, borderLeft: `1 solid ${RANG.chegara}` },
  qatorBosh: {
    flexDirection: "row",
    backgroundColor: RANG.brand,
  },
  qator: {
    flexDirection: "row",
    borderBottom: `1 solid ${RANG.chegaraOchiq}`,
  },
  qatorZebra: {
    flexDirection: "row",
    borderBottom: `1 solid ${RANG.chegaraOchiq}`,
    backgroundColor: RANG.zebraFon,
  },
  katak: {
    borderRight: `1 solid ${RANG.chegara}`,
    paddingVertical: 6,
    paddingHorizontal: 5,
    justifyContent: "center",
  },
  katakBoshMatni: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  katakMatni: { fontSize: 8.5 },
  katakXira: { fontSize: 8, color: RANG.matnXira },
  belgi: { fontSize: 8, fontFamily: "Helvetica-Bold", color: RANG.brand, textAlign: "center" },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: RANG.matnXira,
    borderTop: `0.5 solid ${RANG.chegaraOchiq}`,
    paddingTop: 6,
  },
});

// Ustun kengliklari (% sifatida, jami ~100)
const KENG = {
  raqam: "4%",
  ism: "22%",
  toifa: "8%",
  filialGuruh: "18%",
  oqituvchi: "16%",
  turi: "8%",
  natija: "13%",
  urinish: "11%",
};

function Jadval({ urinishlar }) {
  return (
    <View style={stil.jadval}>
      <View style={stil.qatorBosh} fixed>
        <View style={[stil.katak, { width: KENG.raqam, borderRightColor: "#ffffff33" }]}>
          <Text style={stil.katakBoshMatni}>№</Text>
        </View>
        <View style={[stil.katak, { width: KENG.ism, borderRightColor: "#ffffff33" }]}>
          <Text style={stil.katakBoshMatni}>Ism familya</Text>
        </View>
        <View style={[stil.katak, { width: KENG.toifa, borderRightColor: "#ffffff33" }]}>
          <Text style={stil.katakBoshMatni}>Toifa</Text>
        </View>
        <View style={[stil.katak, { width: KENG.filialGuruh, borderRightColor: "#ffffff33" }]}>
          <Text style={stil.katakBoshMatni}>Filial / Guruh</Text>
        </View>
        <View style={[stil.katak, { width: KENG.oqituvchi, borderRightColor: "#ffffff33" }]}>
          <Text style={stil.katakBoshMatni}>Nazariy o'qituvchi</Text>
        </View>
        <View style={[stil.katak, { width: KENG.turi, borderRightColor: "#ffffff33" }]}>
          <Text style={stil.katakBoshMatni}>Turi</Text>
        </View>
        <View style={[stil.katak, { width: KENG.natija, borderRightColor: "#ffffff33" }]}>
          <Text style={stil.katakBoshMatni}>NATIJA</Text>
        </View>
        <View style={[stil.katak, { width: KENG.urinish, borderRightWidth: 0 }]}>
          <Text style={stil.katakBoshMatni}>URINISH</Text>
        </View>
      </View>

      {urinishlar.map((u, i) => {
        const t = u.talabalar;
        const turi = u.nazariy_kerak && u.amaliy_kerak ? "N+A" : u.nazariy_kerak ? "Nazariy" : u.amaliy_kerak ? "Amaliy" : "—";
        return (
          <View key={u.id} style={i % 2 === 1 ? stil.qatorZebra : stil.qator} wrap={false}>
            <View style={[stil.katak, { width: KENG.raqam }]}>
              <Text style={stil.katakXira}>{i + 1}</Text>
            </View>
            <View style={[stil.katak, { width: KENG.ism }]}>
              <Text style={stil.katakMatni}>{t?.ism_familya || ""}</Text>
            </View>
            <View style={[stil.katak, { width: KENG.toifa }]}>
              <Text style={stil.katakMatni}>{TOIFALAR[t?.toifa] || "—"}</Text>
            </View>
            <View style={[stil.katak, { width: KENG.filialGuruh }]}>
              <Text style={stil.katakXira}>
                {t?.filiallar?.nomi || "—"} / {t?.guruhlar?.nomi || "—"}
              </Text>
            </View>
            <View style={[stil.katak, { width: KENG.oqituvchi }]}>
              <Text style={stil.katakXira}>{t?.nazariy_oqituvchilar?.ism_familya || "—"}</Text>
            </View>
            <View style={[stil.katak, { width: KENG.turi }]}>
              <Text style={stil.belgi}>{turi}</Text>
            </View>
            <View style={[stil.katak, { width: KENG.natija, minHeight: 22 }]}>
              <Text> </Text>
            </View>
            <View style={[stil.katak, { width: KENG.urinish, minHeight: 22, borderRightWidth: 0 }]}>
              <Text> </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ImtihonHujjati({ imtihon, urinishlar, sana }) {
  return (
    <Document title={`Imtihon royxati — ${sanaKorinishi(imtihon.sana)}`}>
      <Page size="A4" orientation="landscape" style={stil.bet}>
        <View style={stil.sarlavhaQatori}>
          <View>
            <View style={stil.brend}>
              <View style={stil.brendNoqta} />
              <Text style={stil.brendMatn}>Xavfsiz Imtihon</Text>
            </View>
            <Text style={stil.sarlavha}>Imtihon ro'yxati — {sanaKorinishi(imtihon.sana)}</Text>
            {imtihon.izoh ? <Text style={stil.izohMatni}>{imtihon.izoh}</Text> : null}
          </View>
          <View style={stil.statBlok}>
            <Text style={stil.statSoni}>{urinishlar.length}</Text>
            <Text style={stil.statLabel}>ishtirokchi</Text>
          </View>
        </View>

        <Jadval urinishlar={urinishlar} />

        <View style={stil.footer} fixed>
          <Text>Chop etilgan sana: {sana}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function GET(so_rov) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Avtorizatsiyadan o'tilmagan", { status: 401 });
  }

  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["hujjatchi", "imtihonchi", "superadmin"].includes(profil?.role)) {
    return new Response("Sizda bu ro'yxatni yuklab olish huquqi yo'q", { status: 403 });
  }

  const { searchParams } = new URL(so_rov.url);
  const imtihonId = searchParams.get("id");
  if (!imtihonId) {
    return new Response("Imtihon ko'rsatilmagan", { status: 400 });
  }

  const [{ data: imtihon, error: imtihonXato }, { data: urinishlarXom, error: urinishXato }] = await Promise.all([
    supabase.from("imtihonlar").select("id, sana, izoh").eq("id", imtihonId).single(),
    supabase
      .from("talaba_imtihonlar")
      .select(URINISH_SELECT)
      .eq("imtihon_id", imtihonId)
      .order("ism_familya", { foreignTable: "talabalar" }),
  ]);

  if (imtihonXato || !imtihon) {
    return new Response("Imtihon topilmadi", { status: 404 });
  }
  if (urinishXato) {
    return new Response(`Ma'lumotlarni yuklashda xatolik: ${urinishXato.message}`, { status: 500 });
  }
  const urinishlar = urinishlarXom || [];

  const sana = new Date().toLocaleDateString("uz-UZ");
  const buffer = await renderToBuffer(<ImtihonHujjati imtihon={imtihon} urinishlar={urinishlar} sana={sana} />);
  const fayNomi = `imtihon-royxati-${imtihon.sana}.pdf`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      // "inline" — yangi vkladkada to'g'ridan-to'g'ri ochilsin (yuklab
      // olinmasin), brauzer PDF ko'ruvchisi orqali darhol pechat qilish mumkin.
      "Content-Disposition": `inline; filename="${fayNomi}"`,
    },
  });
}
