
import { useState } from "react";
import { MdOutlineSecurity } from "react-icons/md";

function Planos() {
    const [tipoPlano, setTipoPlano] = useState("mensal");

    return (
        <div className="container container-planos">

            <div className="toggle-planos">
                <button
                    className={tipoPlano === "mensal" ? "ativo" : ""}
                    onClick={() => setTipoPlano("mensal")}
                >
                    Individual
                </button>

                <button
                    className={tipoPlano === "anual" ? "ativo" : ""}
                    onClick={() => setTipoPlano("anual")}
                >
                    Empresarial
                </button>
            </div>

            {tipoPlano === "mensal" ? (

                <div className="cards-planos">

                    {/* PLANO BÁSICO */}
                    <div className="card-plano card-plano-verde">

                        <div className="div-nome-planos">
                            <div className="icone-planos">
                                <MdOutlineSecurity />
                            </div>
                            <h1>Básico</h1>
                        </div>

                        <p>Ideal para quem está começando a utilizar o VALID.</p>

                        <div className="beneficios">
                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>10 análises mensais</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Acesso aos recursos da plataforma</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Relatórios de análise</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Histórico de análises</p>
                            </div>
                        </div>

                        <div className="preco">
                            <h1>R$ 24,90</h1>
                            <h3>ao mês</h3>
                            <p>R$ 2,49 por análise</p>
                        </div>

                        <div className="div-btn-planos">
                            <a href="" className="btn-planos">Assinar</a>
                        </div>

                    </div>


                    {/* PLANO PLUS */}
                    <div className="card-plano card-plano-branco">

                        <div className="div-nome-planos">
                            <div className="icone-planos-branco">
                                <MdOutlineSecurity />
                            </div>
                            <h1>Plus</h1>
                        </div>

                        <p>Mais análises para profissionais com demanda frequente.</p>

                        <div className="beneficios">
                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>20 análises mensais</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Acesso aos recursos da plataforma</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Relatórios de análise</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Histórico de análises</p>
                            </div>
                        </div>

                        <div className="preco">
                            <h1>R$ 44,90</h1>
                            <h3>ao mês</h3>
                            <p>R$ 2,25 por análise</p>
                        </div>

                        <div className="div-btn-planos">
                            <a href="" className="btn-planos">Assinar</a>
                        </div>

                    </div>


                    {/* PLANO PREMIUM */}
                    <div className="card-plano card-plano-verde">

                        <div className="div-nome-planos">
                            <div className="icone-planos">
                                <MdOutlineSecurity />
                            </div>
                            <h1>Premium</h1>
                        </div>

                        <p>Para quem precisa de maior capacidade de análise.</p>

                        <div className="beneficios">
                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>50 análises mensais</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Acesso aos recursos da plataforma</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Relatórios de análise</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Histórico de análises</p>
                            </div>
                        </div>

                        <div className="preco">
                            <h1>R$ 99,90</h1>
                            <h3>ao mês</h3>
                            <p>R$ 2,00 por análise</p>
                        </div>

                        <div className="div-btn-planos">
                            <a href="" className="btn-planos">Assinar</a>
                        </div>

                    </div>

                </div>

            ) : (

                /* PLANO EMPRESARIAL */
                <div className="cards-planos">

                    <div className="card-plano card-plano-verde card-plano-empresas">

                        <div className="div-nome-planos">
                            <div className="icone-planos">
                                <MdOutlineSecurity />
                            </div>
                            <h1>VALID Empresas</h1>
                        </div>

                        <p>
                            Solução ideal para empresas, departamentos de RH e
                            organizações que precisam realizar análises documentais
                            em maior quantidade.
                        </p>

                        <div className="beneficios">

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>150 análises mensais</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Acesso a todos os recursos da plataforma</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Relatórios detalhados das análises</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Histórico completo de verificações</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Análise de documentos em maior volume</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Organização das verificações realizadas</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Identificação de possíveis alterações</p>
                            </div>

                            <div className="beneficio">
                                <div className="icon-bene"><MdOutlineSecurity /></div>
                                <p>Suporte para demandas empresariais</p>
                            </div>

                        </div>

                        <div className="preco">
                            <h1>R$ 224,90</h1>
                            <h3>ao mês</h3>
                            <p>150 análises | Aproximadamente R$ 1,50 por análise</p>
                        </div>

                        <div className="div-btn-planos">
                            <a href="" className="btn-planos">
                                Assinar plano empresarial
                            </a>
                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}

export default Planos;
