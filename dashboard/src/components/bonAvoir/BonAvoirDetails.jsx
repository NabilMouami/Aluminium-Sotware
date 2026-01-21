import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, Link, useNavigate } from "react-router-dom";
import { config_url } from "@/utils/config";
import {
  FiArrowLeft,
  FiPrinter,
  FiDownload,
  FiCheck,
  FiX,
  FiEdit,
  FiClipboard,
  FiUser,
  FiPackage,
  FiDollarSign,
  FiCalendar,
  FiTag,
  FiFileText,
} from "react-icons/fi";
import { Badge, Button, Card, Row, Col, Table } from "reactstrap";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

const BonAvoirDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bon, setBon] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBonDetail();
  }, [id]);

  const fetchBonDetail = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await axios.get(`${config_url}/api/bon-avoirs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setBon(response.data.bon);
      }
    } catch (error) {
      console.error("Error fetching bon detail:", error);
      MySwal.fire({
        title: "Erreur",
        text: "Impossible de charger les détails du bon d'avoir",
        icon: "error",
      }).then(() => {
        navigate("/bon-avoirs");
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      brouillon: "warning",
      valide: "primary",
      utilise: "success",
      annule: "danger",
    };
    return colors[status] || "secondary";
  };

  const getStatusText = (status) => {
    const texts = {
      brouillon: "Brouillon",
      valide: "Validé",
      utilise: "Utilisé",
      annule: "Annulé",
    };
    return texts[status] || status;
  };

  const getMotifText = (motif) => {
    const texts = {
      retour_produit: "Retour Produit",
      erreur_facturation: "Erreur Facturation",
      remise_commerciale: "Remise Commerciale",
      annulation: "Annulation",
      autre: "Autre",
    };
    return texts[motif] || motif;
  };

  const getMotifColor = (motif) => {
    const colors = {
      retour_produit: "info",
      erreur_facturation: "warning",
      remise_commerciale: "success",
      annulation: "danger",
      autre: "secondary",
    };
    return colors[motif] || "secondary";
  };

  const handleValiderBon = async () => {
    const result = await MySwal.fire({
      title: "Valider ce Bon d'Avoir?",
      text: "Le bon d'avoir sera validé et pourra être utilisé sur de futures factures.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Oui, valider",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        await axios.put(
          `${config_url}/api/bon-avoirs/${id}/valider`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        setBon({ ...bon, status: "valide" });
        MySwal.fire("Validé!", "Le bon d'avoir a été validé.", "success");
      } catch (error) {
        MySwal.fire(
          "Erreur!",
          error.response?.data?.message || "Erreur lors de la validation",
          "error",
        );
      }
    }
  };

  const handleAnnulerBon = async () => {
    const result = await MySwal.fire({
      title: "Annuler ce Bon d'Avoir?",
      text: "Le bon d'avoir sera annulé et ne pourra plus être utilisé.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Oui, annuler",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        await axios.put(
          `${config_url}/api/bon-avoirs/${id}/annuler`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        setBon({ ...bon, status: "annule" });
        MySwal.fire("Annulé!", "Le bon d'avoir a été annulé.", "success");
      } catch (error) {
        MySwal.fire(
          "Erreur!",
          error.response?.data?.message || "Erreur lors de l'annulation",
          "error",
        );
      }
    }
  };

  const handleUtiliserBon = async () => {
    // Vous pouvez implémenter la fonctionnalité d'utilisation ici
    MySwal.fire({
      title: "Utiliser ce Bon d'Avoir",
      text: "Fonctionnalité d'utilisation à implémenter",
      icon: "info",
    });
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="mt-2">Chargement du bon d'avoir...</p>
      </div>
    );
  }

  if (!bon) {
    return (
      <div className="text-center py-5">
        <h5>Bon d'avoir non trouvé</h5>
        <Link to="/bon-avoirs">
          <Button color="primary" className="mt-2">
            <FiArrowLeft className="me-2" />
            Retour à la liste
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/bon-avoirs" className="btn btn-outline-secondary me-2">
            <FiArrowLeft className="me-2" />
            Retour
          </Link>
          <h2 className="mb-0 d-inline-block ms-2">
            Bon d'Avoir: {bon.num_bon_avoir}
          </h2>
        </div>
        <div>
          <Button color="primary" className="me-2">
            <FiPrinter className="me-2" />
            Imprimer
          </Button>
          <Button color="secondary">
            <FiDownload className="me-2" />
            Télécharger PDF
          </Button>
        </div>
      </div>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="p-4">
            <h4 className="mb-4">
              <FiPackage className="me-2" />
              Produits
            </h4>
            <Table striped responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Référence</th>
                  <th>Désignation</th>
                  <th className="text-center">Quantité</th>
                  <th className="text-end">Prix Unitaire</th>
                  <th className="text-end">Remise</th>
                  <th className="text-end">Total Ligne</th>
                </tr>
              </thead>
              <tbody>
                {bon.produits?.map((produit, index) => (
                  <tr key={produit.id}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{produit.reference}</strong>
                    </td>
                    <td>{produit.designation}</td>
                    <td className="text-center">
                      {produit.BonAvoirProduit.quantite}
                    </td>
                    <td className="text-end">
                      {parseFloat(
                        produit.BonAvoirProduit.prix_unitaire,
                      ).toFixed(2)}{" "}
                      DH
                    </td>
                    <td className="text-end">
                      {parseFloat(produit.BonAvoirProduit.remise_ligne).toFixed(
                        2,
                      )}{" "}
                      DH
                    </td>
                    <td className="text-end">
                      <strong>
                        {parseFloat(
                          produit.BonAvoirProduit.total_ligne,
                        ).toFixed(2)}{" "}
                        DH
                      </strong>
                    </td>
                  </tr>
                ))}
                <tr className="table-active">
                  <td colSpan={6} className="text-end fw-bold">
                    TOTAL
                  </td>
                  <td className="text-end fw-bold fs-5 text-primary">
                    {parseFloat(bon.montant_total).toFixed(2)} DH
                  </td>
                </tr>
              </tbody>
            </Table>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="p-4 mb-4">
            <h4 className="mb-4">
              <FiFileText className="me-2" />
              Informations
            </h4>
            <div className="mb-3">
              <strong className="d-block mb-1">
                <FiUser className="me-2" />
                Client
              </strong>
              <p className="mb-0">
                {bon.client?.nom_complete || "Client inconnu"}
                <br />
                {bon.client?.telephone && (
                  <small className="text-muted">{bon.client.telephone}</small>
                )}
              </p>
            </div>

            <div className="mb-3">
              <strong className="d-block mb-1">
                <FiClipboard className="me-2" />
                Bon de Livraison Origine
              </strong>
              <p className="mb-0">
                {bon.bonLivraison ? (
                  <>
                    {bon.bonLivraison.num_bon_livraison}
                    <br />
                    <small className="text-muted">
                      Date:{" "}
                      {new Date(
                        bon.bonLivraison.date_creation,
                      ).toLocaleDateString("fr-FR")}
                    </small>
                  </>
                ) : (
                  "Non lié à un bon de livraison"
                )}
              </p>
            </div>

            <div className="mb-3">
              <strong className="d-block mb-1">
                <FiTag className="me-2" />
                Motif
              </strong>
              <Badge color={getMotifColor(bon.motif)} className="fs-6">
                {getMotifText(bon.motif)}
              </Badge>
            </div>

            <div className="mb-3">
              <strong className="d-block mb-1">
                <FiDollarSign className="me-2" />
                Montant Total
              </strong>
              <h3 className="text-primary mb-0">
                {parseFloat(bon.montant_total).toFixed(2)} DH
              </h3>
            </div>

            <div className="mb-3">
              <strong className="d-block mb-1">
                <FiCalendar className="me-2" />
                Dates
              </strong>
              <p className="mb-1">
                <small>
                  Créé le: {new Date(bon.date_creation).toLocaleString("fr-FR")}
                </small>
              </p>
              {bon.utilise_le && (
                <p className="mb-0">
                  <small>
                    Utilisé le:{" "}
                    {new Date(bon.utilise_le).toLocaleDateString("fr-FR")}
                  </small>
                </p>
              )}
            </div>

            <div className="mb-3">
              <strong className="d-block mb-1">Statut</strong>
              <Badge color={getStatusColor(bon.status)} className="fs-6">
                {getStatusText(bon.status)}
              </Badge>
            </div>

            {bon.notes && (
              <div className="mb-3">
                <strong className="d-block mb-1">Notes</strong>
                <p className="mb-0">{bon.notes}</p>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h4 className="mb-4">Actions</h4>
            <div className="d-grid gap-2">
              {bon.status === "brouillon" && (
                <Button color="success" onClick={handleValiderBon}>
                  <FiCheck className="me-2" />
                  Valider le Bon
                </Button>
              )}

              {bon.status === "valide" && (
                <Button color="primary" onClick={handleUtiliserBon}>
                  Utiliser sur une facture
                </Button>
              )}

              {["brouillon", "valide"].includes(bon.status) && (
                <Button color="danger" outline onClick={handleAnnulerBon}>
                  <FiX className="me-2" />
                  Annuler le Bon
                </Button>
              )}

              <Button
                color="warning"
                outline
                tag={Link}
                to={`/bon-avoirs/edit/${bon.id}`}
              >
                <FiEdit className="me-2" />
                Modifier
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default BonAvoirDetail;
