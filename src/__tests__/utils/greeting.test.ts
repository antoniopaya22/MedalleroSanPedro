import { getGreeting } from "@/utils/greeting";

describe("getGreeting", () => {
  it("devuelve el saludo por defecto sin nombre", () => {
    expect(getGreeting()).toBe("Bienvenido a MedalleroSanPedro");
  });

  it("devuelve un saludo personalizado con nombre", () => {
    expect(getGreeting("Antonio")).toBe("Bienvenido, Antonio");
  });

  it("ignora nombres en blanco", () => {
    expect(getGreeting("   ")).toBe("Bienvenido a MedalleroSanPedro");
  });
});
