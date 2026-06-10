"""
Génère le classeur Excel "Gestion-Plus-Modele.xlsx" :
- 1 feuille Guide (vocabulaire + conseils débutants)
- 1 feuille par contexte : Ménage, Commerce physique, E-commerce
  avec un mini tableau de bord (recettes, dépenses, solde, charges fixes)
  et un tableau de transactions avec formules automatiques.

Compatible Excel et Google Sheets (importer/ouvrir le fichier .xlsx).
"""

import datetime as dt

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

GREEN = "1F9D55"
GREEN_LIGHT = "D1F0DD"
GREEN_DARK = "15803D"
GREY = "8B95A1"
RED = "E0524D"

HEADER_FILL = PatternFill("solid", fgColor=GREEN)
HEADER_FONT = Font(color="FFFFFF", bold=True)
TITLE_FONT = Font(size=16, bold=True, color="1F2430")
SUBTITLE_FONT = Font(size=10, color=GREY)
LABEL_FONT = Font(bold=True, color=GREEN_DARK)
THIN = Side(style="thin", color="E0E0E0")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
KPI_FILL = PatternFill("solid", fgColor=GREEN_LIGHT)
KPI_FONT = Font(size=14, bold=True, color="1F2430")


def today_str(offset=0):
    return (dt.date.today() + dt.timedelta(days=offset)).strftime("%d/%m/%Y")


def style_header_row(ws, row, first_col, last_col):
    for col in range(first_col, last_col + 1):
        c = ws.cell(row=row, column=col)
        c.fill = HEADER_FILL
        c.font = HEADER_FONT
        c.alignment = Alignment(horizontal="center")
        c.border = BORDER


def add_kpi(ws, row, col, label, formula_or_value, number_format='#,##0.00 "€"'):
    label_cell = ws.cell(row=row, column=col, value=label)
    label_cell.font = SUBTITLE_FONT
    value_cell = ws.cell(row=row + 1, column=col, value=formula_or_value)
    value_cell.font = KPI_FONT
    value_cell.fill = KPI_FILL
    value_cell.number_format = number_format
    value_cell.alignment = Alignment(horizontal="left", vertical="center")
    value_cell.border = BORDER
    ws.row_dimensions[row + 1].height = 24


def build_context_sheet(wb, sheet_name, title, subtitle, fixed_categories, sample_rows):
    ws = wb.create_sheet(sheet_name)

    ws["A1"] = title
    ws["A1"].font = TITLE_FONT
    ws["A2"] = subtitle
    ws["A2"].font = SUBTITLE_FONT

    # Plage des transactions (étendue pour permettre l'ajout de lignes)
    first_data_row = 12
    last_data_row = 200
    type_col = "D"
    amount_col = "E"
    cat_col = "C"

    type_range = f"{type_col}{first_data_row}:{type_col}{last_data_row}"
    amount_range = f"{amount_col}{first_data_row}:{amount_col}{last_data_row}"
    cat_range = f"{cat_col}{first_data_row}:{cat_col}{last_data_row}"

    # KPI : Total recettes / dépenses / solde / charges fixes
    add_kpi(ws, 4, 1, "Total recettes",
            f'=SUMIF({type_range},"Recette",{amount_range})')
    add_kpi(ws, 4, 2, "Total dépenses",
            f'=SUMIF({type_range},"Dépense",{amount_range})')
    add_kpi(ws, 4, 3, "Solde", 0)
    add_kpi(ws, 4, 4, "Charges fixes (du mois)", 0)

    # Solde réel = recettes - dépenses (cellules B5 et A5 sont les valeurs KPI)
    ws["C5"] = "=A5-B5"
    ws["C5"].number_format = '#,##0.00 "€"'
    ws["C5"].fill = KPI_FILL
    ws["C5"].font = KPI_FONT
    ws["C5"].border = BORDER

    # Charges fixes = somme des dépenses dont la catégorie est dans la liste "fixed_categories"
    sumproduct_terms = "+".join(
        f'(({cat_range}="{c}")*({type_range}="Dépense")*{amount_range})'
        for c in fixed_categories
    )
    ws["D5"] = f"=SUMPRODUCT({sumproduct_terms})"
    ws["D5"].number_format = '#,##0.00 "€"'
    ws["D5"].fill = KPI_FILL
    ws["D5"].font = KPI_FONT
    ws["D5"].border = BORDER

    # Note sous les KPI
    ws["A7"] = ("ℹ️ Charges fixes catégories : " + ", ".join(fixed_categories)
                 + ".  Pour ajouter une catégorie fixe, modifiez la formule "
                   "de la cellule \"Charges fixes (du mois)\" ci-dessus.")
    ws["A7"].font = SUBTITLE_FONT
    ws.merge_cells(start_row=7, start_column=1, end_row=7, end_column=6)
    ws["A7"].alignment = Alignment(wrap_text=True, vertical="top")
    ws.row_dimensions[7].height = 30

    # En-têtes du tableau
    headers = ["Date", "Libellé", "Catégorie", "Type", "Montant (€)", "Notes"]
    header_row = first_data_row - 1
    for i, h in enumerate(headers, start=1):
        ws.cell(row=header_row, column=i, value=h)
    style_header_row(ws, header_row, 1, len(headers))

    # Lignes d'exemple
    for i, (date_, label, cat, typ, amount) in enumerate(sample_rows):
        r = first_data_row + i
        ws.cell(row=r, column=1, value=date_)
        ws.cell(row=r, column=2, value=label)
        ws.cell(row=r, column=3, value=cat)
        ws.cell(row=r, column=4, value=typ)
        amt_cell = ws.cell(row=r, column=5, value=amount)
        amt_cell.number_format = '#,##0.00 "€"'

    # Bordures + format pour toute la plage (y compris lignes vides à compléter)
    for r in range(first_data_row, last_data_row + 1):
        for c in range(1, 7):
            cell = ws.cell(row=r, column=c)
            cell.border = BORDER
            if c == 5:
                cell.number_format = '#,##0.00 "€"'

    # Liste déroulante pour la colonne Type (Recette / Dépense)
    dv = DataValidation(type="list", formula1='"Recette,Dépense"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"D{first_data_row}:D{last_data_row}")

    # Largeurs de colonnes
    widths = {"A": 14, "B": 28, "C": 18, "D": 12, "E": 14, "F": 30}
    for col, width in widths.items():
        ws.column_dimensions[col].width = width

    ws.freeze_panes = ws.cell(row=first_data_row, column=1)

    return ws


def build_guide_sheet(wb):
    ws = wb.create_sheet("Guide", 0)

    ws["A1"] = "📚 Guide du débutant - Gestion+"
    ws["A1"].font = Font(size=18, bold=True)
    ws.merge_cells("A1:D1")

    ws["A3"] = ("Ce classeur contient un onglet par contexte (Ménage, Commerce "
                 "physique, E-commerce). Chaque onglet calcule automatiquement "
                 "vos recettes, dépenses, solde et charges fixes à partir du "
                 "tableau de transactions.")
    ws["A3"].alignment = Alignment(wrap_text=True, vertical="top")
    ws.merge_cells("A3:D3")
    ws.row_dimensions[3].height = 45

    sections = [
        ("🔤 Vocabulaire de base", [
            ("Recette / Revenu", "Argent qui entre : salaire, vente, remboursement, paiement client."),
            ("Dépense", "Argent qui sort : loyer, courses, achat de stock, facture, abonnement."),
            ("Solde", "Solde = Total des recettes − Total des dépenses."),
            ("Charges fixes", "Dépenses récurrentes chaque mois (loyer, électricité, abonnements, salaires)."),
            ("Trésorerie", "Argent immédiatement disponible (caisse + compte) pour payer les dépenses."),
            ("Objectif", "Montant visé (épargne ou chiffre d'affaires) sur une période donnée."),
        ]),
        ("🏠 Pour le ménage", [
            ("1. Notez tout", "Chaque salaire, chaque achat même petit, dans l'onglet Ménage."),
            ("2. Fixe vs variable", "Le loyer/abonnements ne changent pas ; surveillez surtout les dépenses variables (courses, loisirs)."),
            ("3. Règle 50/30/20", "50% besoins essentiels, 30% envies, 20% épargne."),
            ("4. Vérifiez le solde", "Chaque semaine, pour éviter les découverts en fin de mois."),
        ]),
        ("🏪 Pour un commerce physique", [
            ("1. Ventes vs achats de stock", "Une vente = recette ; un réapprovisionnement = dépense."),
            ("2. Trésorerie quotidienne", "Suivez-la pour pouvoir payer fournisseurs et salaires à temps."),
            ("3. Calculez la marge", "Marge = Prix de vente − Coût d'achat."),
            ("4. Anticipez les charges fixes", "Loyer du local, salaires, assurances tombent même si les ventes baissent."),
        ]),
        ("🛒 Pour l'e-commerce", [
            ("1. Tous les frais d'une vente", "Commission plateforme, frais de paiement, livraison, publicité."),
            ("2. Coût d'acquisition client", "Combien dépensez-vous en publicité pour obtenir une commande ?"),
            ("3. Frais fixes mensuels", "Hébergement, abonnements aux outils, logiciel de comptabilité."),
            ("4. Remboursements / litiges", "Ils réduisent vos recettes réelles : suivez-les."),
        ]),
        ("🧭 Comment utiliser ce classeur", [
            ("1. Choisissez l'onglet", "Ménage, Commerce physique ou E-commerce selon votre activité."),
            ("2. Complétez le tableau", "Ajoutez une ligne par opération : Date, Libellé, Catégorie, Type, Montant."),
            ("3. Type = Recette ou Dépense", "Utilisez la liste déroulante de la colonne Type."),
            ("4. Lisez les indicateurs en haut", "Total recettes, Total dépenses, Solde, Charges fixes se mettent à jour automatiquement."),
            ("5. Google Sheets", "Importez ce fichier .xlsx dans Google Sheets (Fichier > Importer) pour le modifier en ligne et le partager."),
        ]),
    ]

    row = 6
    for title, items in sections:
        ws.cell(row=row, column=1, value=title).font = Font(size=13, bold=True, color=GREEN_DARK)
        ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=4)
        row += 1
        for label, desc in items:
            c1 = ws.cell(row=row, column=1, value=label)
            c1.font = Font(bold=True)
            c1.alignment = Alignment(vertical="top", wrap_text=True)
            c2 = ws.cell(row=row, column=2, value=desc)
            c2.alignment = Alignment(vertical="top", wrap_text=True)
            ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=4)
            ws.row_dimensions[row].height = 32
            row += 1
        row += 1

    ws.column_dimensions["A"].width = 26
    ws.column_dimensions["B"].width = 30
    ws.column_dimensions["C"].width = 30
    ws.column_dimensions["D"].width = 30


def main():
    wb = Workbook()
    # supprimer la feuille par défaut, on la recrée via build_guide_sheet
    default_sheet = wb.active
    wb.remove(default_sheet)

    build_guide_sheet(wb)

    build_context_sheet(
        wb, "Ménage",
        title="🏠 Ménage - Budget familial",
        subtitle="Suivez vos recettes et dépenses du foyer",
        fixed_categories=["Logement", "Charges"],
        sample_rows=[
            (today_str(-7), "Salaire", "Revenu", "Recette", 2200),
            (today_str(-6), "Loyer", "Logement", "Dépense", 750),
            (today_str(-5), "Courses Carrefour", "Alimentation", "Dépense", 142.50),
            (today_str(-4), "Électricité", "Charges", "Dépense", 89.30),
            (today_str(-3), "Internet", "Charges", "Dépense", 35.00),
            (today_str(-2), "Remboursement ami", "Revenu", "Recette", 50),
        ],
    )

    build_context_sheet(
        wb, "Commerce physique",
        title="🏪 Commerce physique - Suivi de caisse",
        subtitle="Ventes, achats de stock et charges du commerce",
        fixed_categories=["Loyer local", "Personnel"],
        sample_rows=[
            (today_str(-6), "Vente comptoir", "Vente", "Recette", 980),
            (today_str(-5), "Achat stock - Fournisseur A", "Stock", "Dépense", 1340),
            (today_str(-4), "Vente comptoir", "Vente", "Recette", 1245.60),
            (today_str(-3), "Loyer local", "Loyer local", "Dépense", 900),
            (today_str(-2), "Salaire employé", "Personnel", "Dépense", 1500),
            (today_str(-1), "Vente carte bancaire", "Vente", "Recette", 760.20),
        ],
    )

    build_context_sheet(
        wb, "E-commerce",
        title="🛒 E-commerce - Suivi des ventes en ligne",
        subtitle="Commandes, frais et abonnements de la boutique en ligne",
        fixed_categories=["Abonnement", "Hébergement"],
        sample_rows=[
            (today_str(-5), "Commande #1042", "Vente en ligne", "Recette", 89.99),
            (today_str(-5), "Commande #1041", "Vente en ligne", "Recette", 45.50),
            (today_str(-4), "Frais publicité", "Marketing", "Dépense", 200),
            (today_str(-3), "Commande #1040", "Vente en ligne", "Recette", 120),
            (today_str(-2), "Abonnement plateforme", "Abonnement", "Dépense", 29.90),
            (today_str(-1), "Hébergement site", "Hébergement", "Dépense", 12.00),
        ],
    )

    out_path = "/home/user/c.HOUSE-/templates/Gestion-Plus-Modele.xlsx"
    wb.save(out_path)
    print("Saved:", out_path)


if __name__ == "__main__":
    main()
