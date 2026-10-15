// GENERATED from the OSWARteck pyro-line maintenance checklists — do not edit by hand.
//   Equipment: OSW-PE-MNT-PYR-01 Rev. 05 (539 tasks)
//   Sensors:   OSW-PE-SMT-PYR-01 Rev. 04 (352 tasks)
// Text is verbatim from the PDFs (table rows re-joined across line breaks).
import type { ChecklistUnit } from "@/types/maintenance";

export const EQUIPMENT_UNITS: ChecklistUnit[] = [
 {
  "code": "GEN",
  "title": "General components, valves, flanges and safety hardware",
  "groups": [
   {
    "num": "2.1",
    "title": "Safety, interface and housekeeping",
    "tasks": [
     {
      "id": "GEN-001",
      "component": "Asset identification / tag plates",
      "check": [
       {
        "label": null,
        "text": "Verify machine, motor, valve, line and isolation tags correspond to approved register and P&ID."
       }
      ],
      "pass": "Tags legible and traceable; correct missing or conflicting IDs.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-002",
      "component": "Fixed guards / inspection barriers",
      "check": [
       {
        "label": null,
        "text": "Inspect guards, retaining fasteners, locks and reach-prevention from safe side."
       }
      ],
      "pass": "No missing hardware, open access or exposed hazardous motion; isolate and restore before use.",
      "freq": "Daily",
      "owner": "OP",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-003",
      "component": "Rotating-coupling and shaft guards",
      "check": [
       {
        "label": null,
        "text": "Check cover condition, inspection-window closure and fasteners without reaching inside."
       }
      ],
      "pass": "No rub, damage or absent guard; stop and isolate prior to repair.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-004",
      "component": "Equipment anchor bolts / grout",
      "check": [
       {
        "label": null,
        "text": "Check for movement, cracked grout and looseness indicators externally."
       }
      ],
      "pass": "No relative movement, pulled anchor or grout failure; engineer repair/torque at stop.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-005",
      "component": "Support frames / baseplates / brackets",
      "check": [
       {
        "label": null,
        "text": "Inspect welds, corrosion, deflection and contact points."
       }
      ],
      "pass": "No structural crack, distortion or progressive settlement; engineering review on defect.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-006",
      "component": "Platforms / stairs / toe plates / handrails",
      "check": [
       {
        "label": null,
        "text": "Walk down integrity, grating clips, obstruction and corrosion."
       }
      ],
      "pass": "Secure walking surfaces; barricade dangerous platforms and raise work order.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-007",
      "component": "Access doors / manways / sight ports",
      "check": [
       {
        "label": null,
        "text": "Check external closure, latch, gasket edge and dust or hot-gas leakage."
       }
      ],
      "pass": "Closed, sealed, no leaks; internal opening only under approved shutdown permit.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-008",
      "component": "Thermal insulation / cladding",
      "check": [
       {
        "label": null,
        "text": "Check exposed refractory/insulation, hot patches and missing cladding from safe distance."
       }
      ],
      "pass": "No new exposed hot spots or loose lagging; plan thermal repair.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-009",
      "component": "Equipment earthing / bonding",
      "check": [
       {
        "label": null,
        "text": "Inspect accessible earth lugs, braided jumpers and obvious corrosion."
       }
      ],
      "pass": "Intact connections; scheduled continuity testing by qualified electrician.",
      "freq": "Quarterly",
      "owner": "EL",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "GEN-010",
      "component": "Emergency stops / local pull cords",
      "check": [
       {
        "label": null,
        "text": "Check intact accessible stations; functional tests under planned controlled conditions."
       }
      ],
      "pass": "All devices identified and operable; never defeat interlocks.",
      "freq": "Quarterly",
      "owner": "EL",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "GEN-011",
      "component": "LOTO points / isolators / local switches",
      "check": [
       {
        "label": null,
        "text": "Compare isolators with isolation register and labels; verify lockability."
       }
      ],
      "pass": "Isolation map complete including pneumatic, hydraulic, thermal and gravity energy.",
      "freq": "Annually",
      "owner": "EH",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "GEN-012",
      "component": "Oil / coal / dust spill collection",
      "check": [
       {
        "label": null,
        "text": "Inspect floor drains, absorbents, sumps, housekeeping near machinery."
       }
      ],
      "pass": "No accumulated spills or secondary hazards; clean using site-approved method.",
      "freq": "Daily",
      "owner": "OP",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-013",
      "component": "Pipe / duct supports and sliding guides",
      "check": [
       {
        "label": null,
        "text": "Check hangers, shoes, spring support condition, movement/stop clearances."
       }
      ],
      "pass": "No broken hangers or restraint conflicts; repair to engineered setting.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-014",
      "component": "Maintenance access / lifting lugs",
      "check": [
       {
        "label": null,
        "text": "Inspect tagged lifting points and temporary lifting attachments prior to use."
       }
      ],
      "pass": "Load rated and inspected; no improvised lift on duct or process pipe.",
      "freq": "Event-based",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "GEN-015",
      "component": "Fasteners / locking devices",
      "check": [
       {
        "label": null,
        "text": "Inspect marked nuts, studs, cotters, lock plates and anti- rotation devices."
       }
      ],
      "pass": "No lost retainers, back-out or progressive loosening; use OEM torque.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-016",
      "component": "Cable trays / conduits / glands",
      "check": [
       {
        "label": null,
        "text": "Inspect shielding, heat damage, gland seals, strain relief and bracket security."
       }
      ],
      "pass": "No exposed conductors or damaged insulation; isolate for electrical repair.",
      "freq": "Monthly",
      "owner": "EL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-017",
      "component": "Fire protection and escape access",
      "check": [
       {
        "label": null,
        "text": "Inspect extinguisher access, blocked escape routes, hydrant/hoses near equipment."
       }
      ],
      "pass": "Clear and compliant with plant fire plan; notify EHS on defect.",
      "freq": "Weekly",
      "owner": "EH",
      "mode": "RUN",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "2.2",
    "title": "Valves, flanges and line accessories - apply where installed",
    "tasks": [
     {
      "id": "GEN-018",
      "component": "Isolation valves (ball / gate / butterfly)",
      "check": [
       {
        "label": null,
        "text": "Check tagged position, gland leakage, flange weep and accessibility; travel test on isolated circuit."
       }
      ],
      "pass": "Correct position and leak-tight; repair packing/seat after isolation.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "GEN-019",
      "component": "Knife / slide / flap valves",
      "check": [
       {
        "label": null,
        "text": "Examine actuator, guides, limit feedback and leakage around gate from outside."
       }
      ],
      "pass": "Smooth authorized travel and no material bypass; strip/adjust offline.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "GEN-020",
      "component": "Check / non-return valves",
      "check": [
       {
        "label": null,
        "text": "Verify directional service, no reverse-pressure symptoms; inspect internals on planned outage."
       }
      ],
      "pass": "No backflow or sticking; replace wear parts after isolation.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "GEN-021",
      "component": "Solenoid / pneumatically actuated valves",
      "check": [
       {
        "label": null,
        "text": "Inspect coils, connectors, pilot exhaust and travel feedback; controlled exercise at stop."
       }
      ],
      "pass": "Correct commanded response without uncontrolled motion; repair pilot/diaphragm.",
      "freq": "Quarterly",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "GEN-022",
      "component": "Pressure relief / safety valves",
      "check": [
       {
        "label": null,
        "text": "Verify seals, setpoint certificate, discharge routing and evidence of lifting; bench/test by plan."
       }
      ],
      "pass": "Certified function per site code; remove from service if uncertain.",
      "freq": "Annually",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "GEN-023",
      "component": "Pressure regulator / FRL units",
      "check": [
       {
        "label": null,
        "text": "Inspect set/actual pressure, filter bowl, condensate drain and outlet pressure."
       }
      ],
      "pass": "In OEM operating envelope; change filter/seal and correct air quality.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "GEN-024",
      "component": "Manual drains / vents / bleed fittings",
      "check": [
       {
        "label": null,
        "text": "Check for plugged outlets, caps, weeping, protection against hot discharge."
       }
      ],
      "pass": "Leak-free, accessible, and only opened under approved depressurizing procedure.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "GEN-025",
      "component": "Flanged joints / pipe gaskets",
      "check": [
       {
        "label": null,
        "text": "Observe gasket extrusion, powder leaks, erosion jets and bolt condition from safe side."
       }
      ],
      "pass": "No visible leakage or missing fasteners; isolated gasket/bolt replacement if defective.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-026",
      "component": "Threaded fittings / union nuts",
      "check": [
       {
        "label": null,
        "text": "Visual check for air/oil/dust weeping, movement and vibration fatigue."
       }
      ],
      "pass": "No leakage or movement; repair isolated.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-027",
      "component": "Flexible hoses / couplers",
      "check": [
       {
        "label": null,
        "text": "Look for rubbing, hot contact, blistering, braid exposure, kinking or wetness without touching."
       }
      ],
      "pass": "No damage/leak; replace approved assembly, never patch pressure hose.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-028",
      "component": "Expansion joints / bellows / fabric connectors",
      "check": [
       {
        "label": null,
        "text": "Look for tears, cracked bolting, misalignment, over-travel or dust streaks."
       }
      ],
      "pass": "No breach or restraint failure; replace with correct temperature grade.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "GEN-030",
      "component": "Valve handles, travel indicators and asset labels",
      "check": [
       {
        "label": null,
        "text": "Inspect mechanical position indicator/handle and labeling against verified valve position. Instrument limit-switch proof tests are in the sensor checklist."
       }
      ],
      "pass": "Mechanical OPEN/CLOSE identification matches confirmed valve position; handle and stop undamaged.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "GEN-032",
      "component": "Air / dust / oil pipe clamps and guides",
      "check": [
       {
        "label": null,
        "text": "Look for chafing, missing saddle pads, rubbing or unsupported span."
       }
      ],
      "pass": "No motion against steel or heat sources; reinstate supports.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "2.3",
    "title": "ULTRON sensor / data integrity and instrumentation",
    "tasks": [
     {
      "id": "GEN-045",
      "component": "Power supply / network gateway / switch / UPS",
      "check": [
       {
        "label": null,
        "text": "Verify alarms, supply redundancy where installed and logged availability."
       }
      ],
      "pass": "Edge read-only system reliable; no impact on plant control.",
      "freq": "Quarterly",
      "owner": "EL",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "GEN-046",
      "component": "PLCs/SIS protection boundary",
      "check": [
       {
        "label": null,
        "text": "Audit that ULTRON remains read-only and plant interlocks are unchanged."
       }
      ],
      "pass": "No unauthorized control output or safety bypass.",
      "freq": "Annually",
      "owner": "EH",
      "mode": "OFF",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "2.4",
    "title": "Detailed mechanical integrity and line-component register",
    "tasks": [
     {
      "id": "GEN-048",
      "component": "Master valve and flange census",
      "check": [
       {
        "label": null,
        "text": "Walk every process/utility line against its P&ID; identify valve, expansion joint, flange, gasket, spectacle blind, vent and drain tag/location."
       }
      ],
      "pass": "Record each physical item and criticality in CMMS; no system-wide pass from one generic line.",
      "freq": "Annually",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "GEN-049",
      "component": "Bolting, stud material and gasket compatibility",
      "check": [
       {
        "label": null,
        "text": "Check nameplate/drawing material, heat class and correct gasket for hot gas, oil, water or compressed air services."
       }
      ],
      "pass": "Materials match OEM/P&ID and specification; replace non-conforming parts during isolation.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "GEN-050",
      "component": "Actuator diaphragm, solenoid- valve body and pneumatic tubing",
      "check": [
       {
        "label": null,
        "text": "Inspect mechanical travel, pilot air lines, leakage, springs, fasteners and limit stops on isolated actuator; leave signal verification to the instrument checklist."
       }
      ],
      "pass": "Fails to design-safe state; full authorised stroke without hunting or leakage.",
      "freq": "Quarterly",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "GEN-051",
      "component": "Duct and pipe temporary blanks / spectacles",
      "check": [
       {
        "label": null,
        "text": "Verify installed position, identification, locking devices and isolation register against maintenance permit."
       }
      ],
      "pass": "Positive isolation evidenced and re-instated before startup; no untracked blind.",
      "freq": "Event-based",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "GEN-053",
      "component": "Flexible expansion-joint restraint rods and guides",
      "check": [
       {
        "label": null,
        "text": "Inspect cold-setting witness marks, tie rods, liners and sliding supports for abnormal travel."
       }
      ],
      "pass": "Expansion freedom within design; no bent rod or rubbing.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "GEN-054",
      "component": "Rotating bearings - grease drains, vents and labyrinths",
      "check": [
       {
        "label": null,
        "text": "Confirm vent/drain passages, seal condition, grease quality, and no excess grease in end shields."
       }
      ],
      "pass": "OEM grease volume/grade and passage integrity; replace damaged seals.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "GEN-055",
      "component": "Rotating fans - shaft seal and drain nipples",
      "check": [
       {
        "label": null,
        "text": "Check dust/oil trails, bearing pedestal breathers, drain fittings, inspection doors and casing bolting."
       }
      ],
      "pass": "Leak tight and no rub; inspect bearing after OEM-safe shutdown.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "GEN-056",
      "component": "Service-air header drains, strainers and filters",
      "check": [
       {
        "label": null,
        "text": "Inspect header branch fittings, receiver drainage, strainer fouling and regulator body; pressure gauge accuracy is tested in sensor checklist."
       }
      ],
      "pass": "Dry supply, pressure in approved range, no open-end leaks.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "GEN-057",
      "component": "Thrust/support-roller oil bath sight glasses and breathers",
      "check": [
       {
        "label": null,
        "text": "Inspect physical reservoir glass, breather, cap and flange integrity on installed roller lubrication assemblies; sensor alarm check is separate."
       }
      ],
      "pass": "Clean visible level and no weep; replace defective parts during isolation.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 },
 {
  "code": "FSL-01",
  "title": "Raw-meal feed silo and extraction",
  "groups": [
   {
    "num": "3.1",
    "title": "Raw-meal silo structure and extraction",
    "tasks": [
     {
      "id": "FSL-001",
      "component": "Roof shell / roof stiffeners",
      "check": [
       {
        "label": null,
        "text": "Inspect corrosion, buckling, powder leaks and weld seams from approved access."
       }
      ],
      "pass": "No progressive cracks, perforation or rust; repair under engineer-approved plan.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "FSL-002",
      "component": "Cylinder shell / cone welds",
      "check": [
       {
        "label": null,
        "text": "Inspect joints and cone transition for cracks, buckling and erosion marks."
       }
      ],
      "pass": "No dust paths or deformation; UT thickness where wear suspected.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "FSL-003",
      "component": "Silo support legs / braces",
      "check": [
       {
        "label": null,
        "text": "Check settlement, cracked gussets, anchor-bolt tightness marks and pads."
       }
      ],
      "pass": "No structural movement; refer distortion to structural engineer.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "FSL-004",
      "component": "Silo roof handrails / hatch / vent",
      "check": [
       {
        "label": null,
        "text": "Examine guardrails, access hatch gaskets and venting path."
       }
      ],
      "pass": "Guards firm; hatch sealed, vent functional per plant P&ID.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "FSL-006",
      "component": "Aeration pads / fabric tiles",
      "check": [
       {
        "label": null,
        "text": "Track extraction behavior; inspect pads and fixing strips after cool/deenergized emptying."
       }
      ],
      "pass": "No torn, blinded or detached segments; replace damaged fabric.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "FSL-007",
      "component": "Aeration plenum / pad supports",
      "check": [
       {
        "label": null,
        "text": "Inspect plenum seams, divider plates, distribution holes and gaskets at stop."
       }
      ],
      "pass": "Uniform path, no leakage/broken baffle; seal/repair.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "FSL-008",
      "component": "Aeration air header / branches",
      "check": [
       {
        "label": null,
        "text": "Trend supply pressure; inspect all branch valves, unions, flexible connectors."
       }
      ],
      "pass": "Expected pressure for running blower and no branch leaks; clear/replace offline.",
      "freq": "Daily",
      "owner": "OP",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "FSL-010",
      "component": "Extraction gate blade / seat",
      "check": [
       {
        "label": null,
        "text": "Confirm open/close position and external powder leakage; inspect seat edge at stop."
       }
      ],
      "pass": "No sticking or carry-over, close-to-command agreement.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN + STOP",
      "scope": "BASE"
     },
     {
      "id": "FSL-011",
      "component": "Gate actuator / gearbox / pneumatic cylinder",
      "check": [
       {
        "label": null,
        "text": "Inspect travel, coupling, limit switches, air lines, fasteners and seals."
       }
      ],
      "pass": "Travels correctly in authorized test, no air/oil leaks; overhaul at stop.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "FSL-012",
      "component": "Extraction discharge chute / air slide",
      "check": [
       {
        "label": null,
        "text": "Check dust release, buildup signs, vibration, chute liners and flexible seals."
       }
      ],
      "pass": "Continuous extraction without spill; renew liners/fabric after isolation.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "FSL-013",
      "component": "Gate and chute flange gaskets",
      "check": [
       {
        "label": null,
        "text": "Inspect bolting and powder streaks at flanged connections."
       }
      ],
      "pass": "No dust leakage; replace gaskets and corroded hardware offline.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "FSL-014",
      "component": "Silo overpressure / vacuum relief device",
      "check": [
       {
        "label": null,
        "text": "Identify whether fitted; check obstruction, certification and vent routing."
       }
      ],
      "pass": "Operable and correctly rated per silo design; service by qualified personnel.",
      "freq": "Annually",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "FSL-015",
      "component": "Silo roof instrument-nozzle flange and gasket",
      "check": [
       {
        "label": null,
        "text": "Inspect roof nozzle mechanical integrity and water/dust leakage from approved external access. Radar calibration and echo checks remain in sensor checklist."
       }
      ],
      "pass": "Dry, sealed, secured; maintain under permitted access.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "3.2",
    "title": "Duty / standby aeration blower sets and electrical",
    "tasks": [
     {
      "id": "FSL-017",
      "component": "Duty / standby availability and auto-changeover",
      "check": [
       {
        "label": null,
        "text": "Confirm PLC indications and planned controlled switchover record."
       }
      ],
      "pass": "No unacknowledged trip and backup available; repair control fault.",
      "freq": "Weekly",
      "owner": "EL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "FSL-018",
      "component": "Aeration blower intake filter and silencer",
      "check": [
       {
        "label": null,
        "text": "Inspect filter media, intake obstruction, housing seal and silencer integrity from safe side; pressure measurement, if installed, is a separate instrument task."
       }
      ],
      "pass": "Unblocked airflow and no damaged acoustic media; clean offline.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "FSL-019",
      "component": "Blower casing / lobes or impeller",
      "check": [
       {
        "label": null,
        "text": "Trend noise/temperature and inspect rotor clearance on planned outage. Perform on the standby unit after a controlled changeover."
       }
      ],
      "pass": "No rubbing or foreign matter; restore OEM clearances.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "FSL-020",
      "component": "Duty blower shaft / coupling / guard",
      "check": [
       {
        "label": null,
        "text": "Listen for abnormal noise from designated safe route; inspect alignment offline. Perform on the standby unit after a controlled changeover."
       }
      ],
      "pass": "No knocking/guard contact; align and lubricate per OEM.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "FSL-021",
      "component": "Duty blower bearings / shaft seals",
      "check": [
       {
        "label": null,
        "text": "Inspect leakage and bearing temperature using approved external methods."
       }
      ],
      "pass": "Normal trend and no oil/grease loss; investigate deterioration.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "FSL-022",
      "component": "Blower relief / nonreturn / branch isolation valves",
      "check": [
       {
        "label": null,
        "text": "Confirm installed protective devices and no reverse flow symptoms; stop-test."
       }
      ],
      "pass": "Correct routing, reverse-flow prevention and certified relief settings.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "FSL-023",
      "component": "Blower intake / discharge drain points (if fitted)",
      "check": [
       {
        "label": null,
        "text": "Confirm whether drain points exist on the installed rotary-lobe blower and discharge line; where fitted, check drains are clear and closed."
       }
      ],
      "pass": "Dry supply; remove condensate and address moisture source.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "FSL-024",
      "component": "Blower motor / terminal box",
      "check": [
       {
        "label": null,
        "text": "Check cooling fins, fan guard, cable glands and abnormal heat externally. Perform on the standby unit after a controlled changeover."
       }
      ],
      "pass": "No heat damage; clean and test insulation at outage.",
      "freq": "Quarterly",
      "owner": "EL",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "FSL-025",
      "component": "Blower starter / MCC / overload protection",
      "check": [
       {
        "label": null,
        "text": "Compare displayed current, trip history and duty/standby interlocks. Perform on the standby unit after a controlled changeover."
       }
      ],
      "pass": "Protection intact; test with maintenance permit, no bypass.",
      "freq": "Quarterly",
      "owner": "EL",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "FSL-026",
      "component": "Blower baseplate / anchor fasteners",
      "check": [
       {
        "label": null,
        "text": "Inspect loosening, pipe reaction and skid vibration."
       }
      ],
      "pass": "No movement or cracked supports; repair alignment/foundation.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "FSL-027",
      "component": "Blower discharge flexible connection",
      "check": [
       {
        "label": null,
        "text": "Inspect seam, clamps and heat/friction damage externally."
       }
      ],
      "pass": "No leaking air or split connector; isolate and replace.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "3.3",
    "title": "Silo vent, safety relief and discharge connections",
    "tasks": [
     {
      "id": "FSL-028",
      "component": "Feed silo roof vent filter (if fitted)",
      "check": [
       {
        "label": null,
        "text": "Confirm vent-filter presence; inspect external dust discharge and pressure trend, with offline media inspection."
       }
      ],
      "pass": "No overpressure risk or powder bypass; restore venting and service media.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "FSL-029",
      "component": "Silo vent pulse manifold / diaphragm valves (if fitted)",
      "check": [
       {
        "label": null,
        "text": "Record installed valves/lines; review cleaning sequence and safe compressed-air pressure."
       }
      ],
      "pass": "All pulses accounted for; no stuck-open diaphragm; isolate before opening.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "FSL-030",
      "component": "Extraction gate upstream/downstream chute flanges",
      "check": [
       {
        "label": null,
        "text": "Inspect flange gasket extrusion, dust trails, blanking provision and chute liners."
       }
      ],
      "pass": "No powder release or material hang-up; replace wear/gasket at stop.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     }
    ]
   }
  ]
 },
 {
  "code": "KFS-01",
  "title": "Kiln feed and dosing",
  "groups": [
   {
    "num": "4.1",
    "title": "Weigh bin, dosing valve and weighing controls",
    "tasks": [
     {
      "id": "KFS-001",
      "component": "Feed-bin roof / shell / cone",
      "check": [
       {
        "label": null,
        "text": "Inspect deformation, dust streaks, liner wear and roof access gasket."
       }
      ],
      "pass": "No leak/crack; repair under isolated process conditions.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KFS-005",
      "component": "Weigh-bin flex connectors",
      "check": [
       {
        "label": null,
        "text": "Examine expansion travel, dust leaks and unintentional side load to load cells."
       }
      ],
      "pass": "No bridging/rigid load path; repair flexible connector.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KFS-006",
      "component": "Bin cone aeration fittings",
      "check": [
       {
        "label": null,
        "text": "Inspect aeration air supply, valves, pad gaskets and vibration of supports."
       }
      ],
      "pass": "No airflow restriction or leakage; overhaul in isolated empty-bin state.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KFS-007",
      "component": "Kiln-feed dosing gate blade, seat and guides",
      "check": [
       {
        "label": null,
        "text": "Inspect gate blade, seat, linkages and guides for wear, buildup, leakage and sticking, isolated; position-feedback instrument check is separate."
       }
      ],
      "pass": "Blade, seat and guides free of significant wear/binding; sealing and stroke against OEM mechanical limits.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KFS-008",
      "component": "Dosing gate actuator mechanical assembly",
      "check": [
       {
        "label": null,
        "text": "Inspect actuator shaft, diaphragm/cylinder, fasteners, glands, air lines and travel stops under authorized isolation; feedback calibration is separate."
       }
      ],
      "pass": "Actuator travels without binding, air/oil leakage or failed mounts under controlled test; OEM stroke stops intact.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KFS-009",
      "component": "Dosing valve gland / shaft seals",
      "check": [
       {
        "label": null,
        "text": "Inspect leakage, packing compression and shaft wear."
       }
      ],
      "pass": "No visible dust or pneumatic leak; replace packing offline.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KFS-010",
      "component": "Weigh-bin access doors / flange hardware",
      "check": [
       {
        "label": null,
        "text": "Inspect gasket, stud/nut condition and safe access."
       }
      ],
      "pass": "Sealed; repair offline before powder accumulates.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "4.2",
    "title": "Air slide, aeration system and solids flow meter",
    "tasks": [
     {
      "id": "KFS-011",
      "component": "Air-slide upper and lower channel",
      "check": [
       {
        "label": null,
        "text": "Check structure, slope supports, powder leakage and abnormal blockage symptoms."
       }
      ],
      "pass": "Steady feed with sealed trough; open only after isolation.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KFS-012",
      "component": "Air-slide permeable fabric",
      "check": [
       {
        "label": null,
        "text": "Inspect torn/blocked sections and retaining strips at maintenance outage."
       }
      ],
      "pass": "Uniform aeration, no direct bypass or detached fabric.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KFS-013",
      "component": "Air-slide plenum, air distribution and seals",
      "check": [
       {
        "label": null,
        "text": "Check mechanical air-plenum integrity, aeration pipe/flange leakage, supports and cloth connection; leave pressure-channel testing to the sensor checklist."
       }
      ],
      "pass": "Air-plenum enclosure and fabric interface sealed, support secure, no dust or fluidising-air leakage.",
      "freq": "Daily",
      "owner": "OP",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KFS-014",
      "component": "Air-slide blower motor / intake",
      "check": [
       {
        "label": null,
        "text": "Check current, abnormal sound, filter and cooler openings if installed."
       }
      ],
      "pass": "Motor operates within OEM band, no blocked intake.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KFS-015",
      "component": "Air-slide blower coupling / bearing / base",
      "check": [
       {
        "label": null,
        "text": "Inspect guard, lubrication, shaft condition and foundation at stop."
       }
      ],
      "pass": "No rub, misalignment or leakage; service per OEM.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KFS-016",
      "component": "Air-slide isolation valve / nonreturn valve",
      "check": [
       {
        "label": null,
        "text": "Check correct flow direction, leakage and pneumatic actuator, if fitted."
       }
      ],
      "pass": "Positive isolation during authorized test; repair leaking seat.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "KFS-017",
      "component": "Air-slide flanges / flexible connectors",
      "check": [
       {
        "label": null,
        "text": "Check dust tracks, expansion and loosening along trough."
       }
      ],
      "pass": "No powder escape; renew gasket or connection.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KFS-021",
      "component": "Feed transfer chutes / elbows / wear liners",
      "check": [
       {
        "label": null,
        "text": "Check accumulation and erosion at bends or diverters."
       }
      ],
      "pass": "No seepage or plugging; reline during isolation.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KFS-022",
      "component": "Feed duct inspection covers / cleanouts",
      "check": [
       {
        "label": null,
        "text": "Inspect closure, hinges and gasket."
       }
      ],
      "pass": "Sealed and accessible; only clear after energy and material isolation.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "4.3",
    "title": "Bucket elevator - boot, casing, head and drive",
    "tasks": [
     {
      "id": "KFS-023",
      "component": "Elevator head casing / hood / access seals",
      "check": [
       {
        "label": null,
        "text": "Check for dust leaks, deformation and access-door gaskets."
       }
      ],
      "pass": "Leak-free, guards intact, no internal access while running.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KFS-024",
      "component": "Elevator buckets / attachment bolts",
      "check": [
       {
        "label": null,
        "text": "At outage inspect wear, cracks, loose bolts and bucket pitch."
       }
      ],
      "pass": "No missing bucket or pullout; replace damaged set.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KFS-025",
      "component": "Elevator belt or chain (OEM type)",
      "check": [
       {
        "label": null,
        "text": "Inspect splice/joints, elongation, cracks, pins, bushings and tracking."
       }
      ],
      "pass": "Within OEM wear/elongation criteria; renew before failure.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KFS-026",
      "component": "Head sprocket/pulley and lagging",
      "check": [
       {
        "label": null,
        "text": "Inspect tooth wear, shaft keying, buildup and eccentricity."
       }
      ],
      "pass": "Within OEM wear limits; clean/replace worn components.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KFS-027",
      "component": "Boot sprocket / return pulley",
      "check": [
       {
        "label": null,
        "text": "Inspect bearing seals, buildup, shaft and alignment."
       }
      ],
      "pass": "No binding, damaged teeth or trapped meal.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KFS-028",
      "component": "Boot take-up / tensioning screws",
      "check": [
       {
        "label": null,
        "text": "Measure stroke, symmetric setting and locking hardware."
       }
      ],
      "pass": "Correct tension and equal take-up travel to OEM specification.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KFS-029",
      "component": "Head-drive bearings / seals",
      "check": [
       {
        "label": null,
        "text": "Trend external vibration and heat, inspect grease seals and oil lines."
       }
      ],
      "pass": "Baseline vibration and temperature; correct lubrication defect.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KFS-030",
      "component": "Head gearbox / breather / oil level",
      "check": [
       {
        "label": null,
        "text": "Check oil condition, leaks, breather, fasteners and coupling in controlled inspection."
       }
      ],
      "pass": "Correct grade/level and no leakage; sample/repair.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KFS-031",
      "component": "Elevator motor / MCC / VFD",
      "check": [
       {
        "label": null,
        "text": "Check running current and fault history, cooling fans and terminal enclosures."
       }
      ],
      "pass": "Current tracks feed and no unexplained drive faults.",
      "freq": "Weekly",
      "owner": "EL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KFS-033",
      "component": "Backstop / anti-runback device and torque arm",
      "check": [
       {
        "label": null,
        "text": "Verify mounting, torque-arm retaining hardware, signs of reverse motion and the OEM inspection / test programme at planned shutdown."
       }
      ],
      "pass": "No uncontrolled reverse rotation; OEM-approved functional verification.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "KFS-034",
      "component": "Elevator leg alignment / casing bolts",
      "check": [
       {
        "label": null,
        "text": "Look for rubbing, seam wear, loose flanges and structural deflection."
       }
      ],
      "pass": "Proper alignment; flange joints sealed.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KFS-035",
      "component": "Elevator head discharge spout and transition chute",
      "check": [
       {
        "label": null,
        "text": "Inspect spout, wear liners, chutes, access covers and dust seals at a controlled stop; a plugged-chute switch is a separate instrument if fitted."
       }
      ],
      "pass": "Chute clear, liner secure and access seals leak-tight; no plugged-chute sensor calibration implied.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KFS-036",
      "component": "Elevator boot cleanout / dust extraction",
      "check": [
       {
        "label": null,
        "text": "Check material buildup and leaks; empty under approved stop and isolation."
       }
      ],
      "pass": "No accumulation reaching moving element or inlet path.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KFS-037",
      "component": "Coupling / key / set screws / coupling guard",
      "check": [
       {
        "label": null,
        "text": "Inspect fit and guard, alignment and fastener witness marks."
       }
      ],
      "pass": "No fretting / loose keys; align at isolated stop.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KFS-038",
      "component": "Bucket elevator head / boot bearing grease points",
      "check": [
       {
        "label": null,
        "text": "Check fitting cleanliness, grease specification and metered quantity."
       }
      ],
      "pass": "Right lubricant applied to correct point at OEM interval.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "4.4",
    "title": "Weighing, feed and conveying auxiliary connections",
    "tasks": [
     {
      "id": "KFS-039",
      "component": "Weigh-bin flexible inlet/outlet boots and dust seals",
      "check": [
       {
        "label": null,
        "text": "Inspect boots for tears and load-cell mechanical constraints; check bolt and clamp seals."
       }
      ],
      "pass": "Free weight measurement without side-load; no meal leakage.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KFS-040",
      "component": "Bucket elevator head dust pickup and seal (if equipped)",
      "check": [
       {
        "label": null,
        "text": "Check extraction branch, flap/vent isolation and liner condition; inspect offline."
       }
      ],
      "pass": "No dust release or plug; positive connection to approved dedusting system.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 },
 {
  "code": "PHC-01",
  "title": "Six-stage preheater and ID fan",
  "groups": [
   {
    "num": "5.1",
    "title": "Cyclone C1, interstage ducts and platform",
    "tasks": [
     {
      "id": "PHC-001",
      "component": "C1 cyclone cylindrical/conical shell",
      "check": [
       {
        "label": null,
        "text": "Check external distortion, dust/air leak tracks, shell welds and supports."
       }
      ],
      "pass": "No leaks/cracks or distortion; repair in planned outage.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-002",
      "component": "C1 refractory / castable / anchors",
      "check": [
       {
        "label": null,
        "text": "During cooled outage inspect lining thickness, anchor security and erosion hot-spots."
       }
      ],
      "pass": "No exposed shell, loose castable or missing anchors; restore OEM lining.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "PHC-003",
      "component": "C1 vortex finder / dip tube (where fitted)",
      "check": [
       {
        "label": null,
        "text": "Inspect lower end for erosion, broken segments, distortion and support fasteners."
       }
      ],
      "pass": "Restored profile and clearance per cyclone OEM; replace worn segments.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "PHC-004",
      "component": "C1 cyclone cone / discharge throat",
      "check": [
       {
        "label": null,
        "text": "Trend stage and cone pressure where allocated; inspect blockage or cone liner wear at stop."
       }
      ],
      "pass": "Passage clear; no unsafe manual blockage removal under hot meal.",
      "freq": "Weekly",
      "owner": "OP",
      "mode": "RUN + STOP",
      "scope": "BASE"
     },
     {
      "id": "PHC-006",
      "component": "C1 downcomer / flap or trickle valve",
      "check": [
       {
        "label": null,
        "text": "Check duct joint, seals, valve/pendulum motion where fitted, liner wear and hang-up."
       }
      ],
      "pass": "No false-air leakage or stuck flap; service isolated.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.2",
    "title": "Cyclone C2, interstage ducts and platform",
    "tasks": [
     {
      "id": "PHC-007",
      "component": "C2 cyclone cylindrical/conical shell",
      "check": [
       {
        "label": null,
        "text": "Check external distortion, dust/air leak tracks, shell welds and supports."
       }
      ],
      "pass": "No leaks/cracks or distortion; repair in planned outage.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-008",
      "component": "C2 refractory / castable / anchors",
      "check": [
       {
        "label": null,
        "text": "During cooled outage inspect lining thickness, anchor security and erosion hot-spots."
       }
      ],
      "pass": "No exposed shell, loose castable or missing anchors; restore OEM lining.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "PHC-009",
      "component": "C2 vortex finder / dip tube (where fitted)",
      "check": [
       {
        "label": null,
        "text": "Inspect lower end for erosion, broken segments, distortion and support fasteners."
       }
      ],
      "pass": "Restored profile and clearance per cyclone OEM; replace worn segments.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "PHC-010",
      "component": "C2 cyclone cone / discharge throat",
      "check": [
       {
        "label": null,
        "text": "Trend stage and cone pressure where allocated; inspect blockage or cone liner wear at stop."
       }
      ],
      "pass": "Passage clear; no unsafe manual blockage removal under hot meal.",
      "freq": "Weekly",
      "owner": "OP",
      "mode": "RUN + STOP",
      "scope": "BASE"
     },
     {
      "id": "PHC-012",
      "component": "C2 downcomer / flap or trickle valve",
      "check": [
       {
        "label": null,
        "text": "Check duct joint, seals, valve/pendulum motion where fitted, liner wear and hang-up."
       }
      ],
      "pass": "No false-air leakage or stuck flap; service isolated.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.3",
    "title": "Cyclone C3, interstage ducts and platform",
    "tasks": [
     {
      "id": "PHC-013",
      "component": "C3 cyclone cylindrical/conical shell",
      "check": [
       {
        "label": null,
        "text": "Check external distortion, dust/air leak tracks, shell welds and supports."
       }
      ],
      "pass": "No leaks/cracks or distortion; repair in planned outage.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-014",
      "component": "C3 refractory / castable / anchors",
      "check": [
       {
        "label": null,
        "text": "During cooled outage inspect lining thickness, anchor security and erosion hot-spots."
       }
      ],
      "pass": "No exposed shell, loose castable or missing anchors; restore OEM lining.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "PHC-015",
      "component": "C3 vortex finder / dip tube (where fitted)",
      "check": [
       {
        "label": null,
        "text": "Inspect lower end for erosion, broken segments, distortion and support fasteners."
       }
      ],
      "pass": "Restored profile and clearance per cyclone OEM; replace worn segments.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "PHC-016",
      "component": "C3 cyclone cone / discharge throat",
      "check": [
       {
        "label": null,
        "text": "Trend stage and cone pressure where allocated; inspect blockage or cone liner wear at stop."
       }
      ],
      "pass": "Passage clear; no unsafe manual blockage removal under hot meal.",
      "freq": "Weekly",
      "owner": "OP",
      "mode": "RUN + STOP",
      "scope": "BASE"
     },
     {
      "id": "PHC-018",
      "component": "C3 downcomer / flap or trickle valve",
      "check": [
       {
        "label": null,
        "text": "Check duct joint, seals, valve/pendulum motion where fitted, liner wear and hang-up."
       }
      ],
      "pass": "No false-air leakage or stuck flap; service isolated.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.4",
    "title": "Cyclone C4, interstage ducts and platform",
    "tasks": [
     {
      "id": "PHC-019",
      "component": "C4 cyclone cylindrical/conical shell",
      "check": [
       {
        "label": null,
        "text": "Check external distortion, dust/air leak tracks, shell welds and supports."
       }
      ],
      "pass": "No leaks/cracks or distortion; repair in planned outage.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-020",
      "component": "C4 refractory / castable / anchors",
      "check": [
       {
        "label": null,
        "text": "During cooled outage inspect lining thickness, anchor security and erosion hot-spots."
       }
      ],
      "pass": "No exposed shell, loose castable or missing anchors; restore OEM lining.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "PHC-021",
      "component": "C4 vortex finder / dip tube (where fitted)",
      "check": [
       {
        "label": null,
        "text": "Inspect lower end for erosion, broken segments, distortion and support fasteners."
       }
      ],
      "pass": "Restored profile and clearance per cyclone OEM; replace worn segments.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "PHC-022",
      "component": "C4 cyclone cone / discharge throat",
      "check": [
       {
        "label": null,
        "text": "Trend stage and cone pressure where allocated; inspect blockage or cone liner wear at stop."
       }
      ],
      "pass": "Passage clear; no unsafe manual blockage removal under hot meal.",
      "freq": "Weekly",
      "owner": "OP",
      "mode": "RUN + STOP",
      "scope": "BASE"
     },
     {
      "id": "PHC-024",
      "component": "C4 downcomer / flap or trickle valve",
      "check": [
       {
        "label": null,
        "text": "Check duct joint, seals, valve/pendulum motion where fitted, liner wear and hang-up."
       }
      ],
      "pass": "No false-air leakage or stuck flap; service isolated.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.5",
    "title": "Cyclone C5, interstage ducts and platform",
    "tasks": [
     {
      "id": "PHC-025",
      "component": "C5 cyclone cylindrical/conical shell",
      "check": [
       {
        "label": null,
        "text": "Check external distortion, dust/air leak tracks, shell welds and supports."
       }
      ],
      "pass": "No leaks/cracks or distortion; repair in planned outage.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-026",
      "component": "C5 refractory / castable / anchors",
      "check": [
       {
        "label": null,
        "text": "During cooled outage inspect lining thickness, anchor security and erosion hot-spots."
       }
      ],
      "pass": "No exposed shell, loose castable or missing anchors; restore OEM lining.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "PHC-027",
      "component": "C5 vortex finder / dip tube (where fitted)",
      "check": [
       {
        "label": null,
        "text": "Inspect lower end for erosion, broken segments, distortion and support fasteners."
       }
      ],
      "pass": "Restored profile and clearance per cyclone OEM; replace worn segments.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "PHC-028",
      "component": "C5 cyclone cone / discharge throat",
      "check": [
       {
        "label": null,
        "text": "Trend stage and cone pressure where allocated; inspect blockage or cone liner wear at stop."
       }
      ],
      "pass": "Passage clear; no unsafe manual blockage removal under hot meal.",
      "freq": "Weekly",
      "owner": "OP",
      "mode": "RUN + STOP",
      "scope": "BASE"
     },
     {
      "id": "PHC-030",
      "component": "C5 downcomer / flap or trickle valve",
      "check": [
       {
        "label": null,
        "text": "Check duct joint, seals, valve/pendulum motion where fitted, liner wear and hang-up."
       }
      ],
      "pass": "No false-air leakage or stuck flap; service isolated.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.6",
    "title": "Cyclone C6, interstage ducts and platform",
    "tasks": [
     {
      "id": "PHC-031",
      "component": "C6 cyclone cylindrical/conical shell",
      "check": [
       {
        "label": null,
        "text": "Check external distortion, dust/air leak tracks, shell welds and supports."
       }
      ],
      "pass": "No leaks/cracks or distortion; repair in planned outage.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-032",
      "component": "C6 refractory / castable / anchors",
      "check": [
       {
        "label": null,
        "text": "During cooled outage inspect lining thickness, anchor security and erosion hot-spots."
       }
      ],
      "pass": "No exposed shell, loose castable or missing anchors; restore OEM lining.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "PHC-033",
      "component": "C6 vortex finder / dip tube (where fitted)",
      "check": [
       {
        "label": null,
        "text": "Inspect lower end for erosion, broken segments, distortion and support fasteners."
       }
      ],
      "pass": "Restored profile and clearance per cyclone OEM; replace worn segments.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "PHC-034",
      "component": "C6 cyclone cone / discharge throat",
      "check": [
       {
        "label": null,
        "text": "Trend stage and cone pressure where allocated; inspect blockage or cone liner wear at stop."
       }
      ],
      "pass": "Passage clear; no unsafe manual blockage removal under hot meal.",
      "freq": "Weekly",
      "owner": "OP",
      "mode": "RUN + STOP",
      "scope": "BASE"
     },
     {
      "id": "PHC-036",
      "component": "C6 downcomer / flap or trickle valve",
      "check": [
       {
        "label": null,
        "text": "Check duct joint, seals, valve/pendulum motion where fitted, liner wear and hang-up."
       }
      ],
      "pass": "No false-air leakage or stuck flap; service isolated.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.7",
    "title": "Lower-stage interfaces, riser, cleaning and safety",
    "tasks": [
     {
      "id": "PHC-038",
      "component": "Kiln riser duct lining / bends",
      "check": [
       {
        "label": null,
        "text": "Inspect shell hot spots, buildup symptom and erosion, then lining during outage."
       }
      ],
      "pass": "Clear free section and intact castable / supports.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN + STOP",
      "scope": "BASE"
     },
     {
      "id": "PHC-039",
      "component": "Interstage gas ducts and elbows",
      "check": [
       {
        "label": null,
        "text": "Inspect leaks, deformation, refractory, erosion plates and expansion movement."
       }
      ],
      "pass": "No false air or hot spots; renew linings at stop.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-040",
      "component": "Raw-meal inlet chute / dispersion box",
      "check": [
       {
        "label": null,
        "text": "Inspect dust leaks, splitter/drop arrangement and abrasion."
       }
      ],
      "pass": "Even distribution and clear chute; remove buildup only isolated.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-041",
      "component": "Final hot-meal chute C6 to kiln",
      "check": [
       {
        "label": null,
        "text": "Track hot meal trend and visually inspect external refractory, flange/support."
       }
      ],
      "pass": "No blockage or leak; maintain covered hot chute at outage.",
      "freq": "Weekly",
      "owner": "OP",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-042",
      "component": "Air cannon / air blaster pressure vessels",
      "check": [
       {
        "label": null,
        "text": "Where fitted, check regulator, receiver certification, solenoid and mounting."
       }
      ],
      "pass": "Certified and secure; function per safe OEM procedure.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "PHC-043",
      "component": "Air cannon nozzle / check and isolation valves",
      "check": [
       {
        "label": null,
        "text": "Where fitted, inspect blowback valve seats, lines, nozzle erosion and leak."
       }
      ],
      "pass": "No uncontrolled discharge; repair under zero-pressure verified isolation.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "PHC-044",
      "component": "Stair towers / hot cyclone platforms",
      "check": [
       {
        "label": null,
        "text": "Check grating, fall protection and hot-surface signs."
       }
      ],
      "pass": "Safe access, no missing grating clip / thermal hazard.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-045",
      "component": "Expansion joints between cyclone/ducts",
      "check": [
       {
        "label": null,
        "text": "Inspect fabric/metal joint condition, frame clearance and sealing."
       }
      ],
      "pass": "No cracks / false air and no excessive restraint.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "PHC-046",
      "component": "High-temperature manhole / inspection ports",
      "check": [
       {
        "label": null,
        "text": "Inspect exterior seals, hot-gas leaks, door lock and gasket."
       }
      ],
      "pass": "Doors sealed; no opening except cooled and permitted.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-064",
      "component": "Cyclone / riser cleaning: hot-meal rush safety",
      "check": [
       {
        "label": null,
        "text": "Before any cyclone, cone or riser cleaning confirm the written procedure and permit, exclusion zone below and around poke doors, heat-resistant PPE, CCR communication, air-blaster / air-lance use before manual poking and a clear escape route."
       }
      ],
      "pass": "Cleaning only under permit with exclusion zone enforced; nobody in a hot-meal flush path; stop work if any control is missing.",
      "freq": "Event-based",
      "owner": "EH",
      "mode": "RUN + STOP",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "5.8",
    "title": "Preheater gas sampling, exit duct, ID fan and motor",
    "tasks": [
     {
      "id": "PHC-050",
      "component": "Exit gas duct / gas-sampling flanges",
      "check": [
       {
        "label": null,
        "text": "Check gas escape/dust leakage, supports, bends and insulation."
       }
      ],
      "pass": "No false air or hot dust release; repair on shut-down.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-051",
      "component": "ID fan impeller / blades / hub",
      "check": [
       {
        "label": null,
        "text": "Compare vibration at stable speed; clean buildup and inspect wear/cracks at outage."
       }
      ],
      "pass": "No blade cracks/imbalance; balance after repair.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN + STOP",
      "scope": "BASE"
     },
     {
      "id": "PHC-052",
      "component": "ID fan casing / inlet cone / shaft seal",
      "check": [
       {
        "label": null,
        "text": "Examine rub marks, dust escape, casing welds, inspection door gaskets."
       }
      ],
      "pass": "No rubbing/leakage; service after isolation.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-053",
      "component": "ID fan inlet damper blades / shaft / linkages",
      "check": [
       {
        "label": null,
        "text": "Compare position command/feedback; inspect bushings and travel end-stops."
       }
      ],
      "pass": "No sticking/slop; repaired without unapproved control overrides.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "PHC-054",
      "component": "ID fan DE / NDE bearings",
      "check": [
       {
        "label": null,
        "text": "Trend temperature/vibration at comparable speed and check lubrication method."
       }
      ],
      "pass": "Stable baseline and OEM temp/velocity limits; raise urgent work order if rising.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-055",
      "component": "ID fan bearing pedestals / hold- down studs",
      "check": [
       {
        "label": null,
        "text": "Check grout, looseness, oil leakage and thermal expansion allowance."
       }
      ],
      "pass": "No movement/cracked plinth; align after repair.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-056",
      "component": "ID fan flexible coupling / guard",
      "check": [
       {
        "label": null,
        "text": "Inspect spacer, fasteners, alignment, guard condition at isolated stop."
       }
      ],
      "pass": "OEM axial/radial alignment maintained.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "PHC-057",
      "component": "ID fan motor / enclosure / cooling",
      "check": [
       {
        "label": null,
        "text": "Trend VFD power/speed, inspect terminal box and fan ventilation."
       }
      ],
      "pass": "No high-temperature alarms or abnormal trip history.",
      "freq": "Weekly",
      "owner": "EL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "PHC-058",
      "component": "ID fan VFD / MCC / isolation",
      "check": [
       {
        "label": null,
        "text": "Check alarms, drive cooling, motor cables, grounding and protective settings."
       }
      ],
      "pass": "No unauthorized protection bypass; electrical test at outage.",
      "freq": "Planned stop",
      "owner": "EL",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "PHC-059",
      "component": "ID fan outlet flex joint / duct to treatment interface",
      "check": [
       {
        "label": null,
        "text": "Inspect joint motion, sealing, connected duct and drain points."
       }
      ],
      "pass": "No gas/dust leak; confirm downstream layout on plant P&ID.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "PHC-060",
      "component": "Downstream gas treatment / raw mill interface",
      "check": [
       {
        "label": null,
        "text": "If installed, verify plant-specific collector/fan order and boundaries."
       }
      ],
      "pass": "Maintenance ownership assigned; not automatically part of 161 signals.",
      "freq": "Annually",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.9",
    "title": "Preheater dust-control boundaries and minor fittings",
    "tasks": [
     {
      "id": "PHC-061",
      "component": "Preheater exit diverter / hot-gas raw-mill damper",
      "check": [
       {
        "label": null,
        "text": "Where installed, confirm actual duct destination, damper blades, shaft seals, actuator, seat and position feedback."
       }
      ],
      "pass": "No hot-gas leakage or stuck movement; verify interlocks with process group.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "PHC-062",
      "component": "Riser / cyclone air cannon quick- exhaust valves and seals",
      "check": [
       {
        "label": null,
        "text": "For each installed blaster, record air header, pilot valve, exhaust port, nozzle, fittings and safe isolation."
       }
      ],
      "pass": "No leaking/blocked air-blaster circuit; safe automated firing checked per OEM.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "PHC-063",
      "component": "Duct expansion-compensator ring, refractory stop and tie rod",
      "check": [
       {
        "label": null,
        "text": "Inspect protection sleeve, external hot spots and abnormal axial/radial movement at interstage joins."
       }
      ],
      "pass": "No false-air ingress or heat shield failure; restore at outage.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 },
 {
  "code": "EXH-IF",
  "title": "Main exhaust gas treatment (ESP and bag filter)",
  "groups": [
   {
    "num": "6.1",
    "title": "A. Gas route, raw-mill interface, ducts, dampers and isolation",
    "tasks": [
     {
      "id": "EXH-001",
      "component": "Gas route / plant P&ID reconciliation",
      "check": [
       {
        "label": null,
        "text": "Walk preheater exit to stack, trace ESP, main bag filter, ID/booster fans, raw-mill branch, bypass and return dust."
       }
      ],
      "pass": "Signed gas-flow map, fan order and collector asset list; no assumed series arrangement.",
      "freq": "Annually",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-002",
      "component": "Preheater outlet takeoff and transition ducts",
      "check": [
       {
        "label": null,
        "text": "Inspect dust tracks, false-air leaks, wall thinning, refractory hot spots and supports."
       }
      ],
      "pass": "No loss of gas containment or support; renew erosion plates at stop.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-003",
      "component": "Gas distribution elbows / turning vanes",
      "check": [
       {
        "label": null,
        "text": "Check exterior distortion, vane weld cracks and wear lining during isolated outage."
       }
      ],
      "pass": "Clear cross-section and intact vanes; replace eroded vanes/bolts.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-004",
      "component": "Gas cooling/conditioning inlet and outlet joints",
      "check": [
       {
        "label": null,
        "text": "Examine shell/duct transition, flange studs, gasket, slip joints and abrasion."
       }
      ],
      "pass": "No leaks, excessive movement or loose guide; correct hot- service parts.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-005",
      "component": "Raw mill operation versus bypass mode",
      "check": [
       {
        "label": null,
        "text": "Document DCS damper states, fan status and correct clean-gas destination for both modes."
       }
      ],
      "pass": "Interlocked routing matches approved cause-effect, with no untracked leak path.",
      "freq": "Quarterly",
      "owner": "OP",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-006",
      "component": "Hot-gas shutoff/diverter flap",
      "check": [
       {
        "label": null,
        "text": "Check commanded travel, shaft supports, link arms, limits, actuator air/oil and gland seal."
       }
      ],
      "pass": "No sticking/partial closure; test only under planned process permit.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-007",
      "component": "Bypass/butterfly damper blades",
      "check": [
       {
        "label": null,
        "text": "Inspect shaft, bushings, refractory/liner, seat, stop settings and wear on both sides."
       }
      ],
      "pass": "Actual travel and sealing conform to OEM; no jam or severe bypass leakage.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-008",
      "component": "Damper electric/pneumatic/hydraulic actuator",
      "check": [
       {
        "label": null,
        "text": "Check gear oil, air filter/regulator, cylinder seals, end switches and anti-condensation heater."
       }
      ],
      "pass": "Position feedback credible and damper reaches allowed stops.",
      "freq": "Quarterly",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-009",
      "component": "Expansion joints fabric, metal or refractory-lined",
      "check": [
       {
        "label": null,
        "text": "Look for fabric splits, burned covers, tie rods, liner abrasion, loose clamp bars and leaking flanges."
       }
      ],
      "pass": "Correct expansion clearance, sealed and restrained; replace defective joint.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-010",
      "component": "Duct support shoes, spring hangers, guide stops",
      "check": [
       {
        "label": null,
        "text": "Inspect shoe travel, rust, thermal offset, support spring index and anchor integrity."
       }
      ],
      "pass": "No binding/overstress; correct cold/hot positions per design.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-011",
      "component": "Duct insulation, cladding, manway gaskets",
      "check": [
       {
        "label": null,
        "text": "Survey safe external shell temperatures, water ingress and hot gas/dust release around doors."
       }
      ],
      "pass": "Insulation intact, manways locked and no exposed hot points.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-012",
      "component": "Duct drain/condensate traps and washout",
      "check": [
       {
        "label": null,
        "text": "Identify approved drains, ensure closures and heat trace condition; isolate before opening."
       }
      ],
      "pass": "No water accumulation or uncontrolled corrosive condensate.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-014",
      "component": "Duct flanges / expansion joint splices",
      "check": [
       {
        "label": null,
        "text": "Map each flange and gasket type; inspect bolt witness marks, erosion and leak tracks."
       }
      ],
      "pass": "Proper hot-service gasket, torque and continuous containment.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-015",
      "component": "Access ladders / anchor plates / working platforms",
      "check": [
       {
        "label": null,
        "text": "Inspect ladders, grating, handrail, scaffold points and hot- pipe clearances."
       }
      ],
      "pass": "Safe structural access without uncontrolled hot exposure.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-016",
      "component": "Gas cleaning plant isolation blinds / dampers",
      "check": [
       {
        "label": null,
        "text": "Verify lockable isolation against P&ID, stored energy, and duct differential pressure."
       }
      ],
      "pass": "Approved positive isolation, no uncontrolled connected branch.",
      "freq": "Event-based",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-017",
      "component": "Gas compensators and expansion-joint hardware",
      "check": [
       {
        "label": null,
        "text": "Inspect compensator restraint hardware, gaskets, fabric/metal corrugations and supports for deterioration; separate leak-sensing instruments are in the instrument appendix."
       }
      ],
      "pass": "Compensator fabric/metal, fasteners, guide/stop and thermal restraints secure with no visible leak/damage.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-018",
      "component": "Hot-gas route dust/gas fugitive emission survey",
      "check": [
       {
        "label": null,
        "text": "Inspect external duct/support path and draft trends under stable load from safe position."
       }
      ],
      "pass": "No new powder deposits, uncontrolled visible emissions or loss of draft.",
      "freq": "Weekly",
      "owner": "OP",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "6.2",
    "title": "B. Gas conditioning tower (GCT) and spray-water system - if installed",
    "tasks": [
     {
      "id": "EXH-019",
      "component": "GCT shell, roof, cone and wind braces",
      "check": [
       {
        "label": null,
        "text": "Check casing leaks, cracked welds, structural supports and external hot patches."
       }
      ],
      "pass": "Sound tower structure and no active corrosion/perforation; engineer repair.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-020",
      "component": "GCT inlet gas baffle/distributor",
      "check": [
       {
        "label": null,
        "text": "At outage inspect inlet vanes for buildup, erosion, distortion, failed welds and stuck dust."
       }
      ],
      "pass": "Flow distributor open and mechanically secured.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-021",
      "component": "GCT refractory/insulation and liner",
      "check": [
       {
        "label": null,
        "text": "Inspect erosion, cracks, anchors and thermal survey results."
       }
      ],
      "pass": "No exposed shell or detached lining; repair with approved material.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-022",
      "component": "Water tank/level/overflow makeup valve",
      "check": [
       {
        "label": null,
        "text": "Check inventory, pump suction availability, inlet strainers and overflow path."
       }
      ],
      "pass": "Stable clean water supply and no uncontrolled overfill.",
      "freq": "Daily",
      "owner": "OP",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-023",
      "component": "Water duty/standby pump motors, bases and couplings",
      "check": [
       {
        "label": null,
        "text": "Check pump vibration, bearing temperature, current, mechanical seal leaks and standby readiness."
       }
      ],
      "pass": "Duty maintains required flow; spare available; no seal spray.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-024",
      "component": "Pump mechanical seals, gland drains and seal flush",
      "check": [
       {
        "label": null,
        "text": "Inspect external weeping, alignment and correct flush configuration; overhaul isolated."
       }
      ],
      "pass": "Leakage within pump OEM limit, no dry-running distress.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-025",
      "component": "Pump suction isolation / strainer / check valves",
      "check": [
       {
        "label": null,
        "text": "Inspect strainers, bypasses, orientation, blockage dP and valve stems."
       }
      ],
      "pass": "Clean suction path and no reverse flow; service without bypassing isolation.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-026",
      "component": "Pump discharge regulating/control valve",
      "check": [
       {
        "label": null,
        "text": "Compare position with water flow/temperature; inspect packing, actuator and travel limits."
       }
      ],
      "pass": "Smooth stable adjustment, no sticking or leak.",
      "freq": "Quarterly",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-027",
      "component": "Water ring main piping / flanges / hoses",
      "check": [
       {
        "label": null,
        "text": "Check corrosion, leaks, gasket/tie rods, strainers and loose brackets."
       }
      ],
      "pass": "No water escape or weak supports; correct hot rated fittings.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-028",
      "component": "Atomising air compressor / receiver connection",
      "check": [
       {
        "label": null,
        "text": "If two-fluid nozzles fitted, verify air quality, drying, line pressure and receiver certification."
       }
      ],
      "pass": "Dry air in approved band with no line restriction.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-030",
      "component": "Spray lances, supports and positioning",
      "check": [
       {
        "label": null,
        "text": "At cooled outage inspect lance distortion, nozzle orientation, erosion and hold-down clamps."
       }
      ],
      "pass": "Sprays positioned to OEM map; no wall wetting.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-031",
      "component": "Spray nozzle orifice/atomiser/strain screen",
      "check": [
       {
        "label": null,
        "text": "Remove and inspect fouling, erosion and water distribution only under safe isolation."
       }
      ],
      "pass": "No plugged or oversize orifices; nozzle flow to OEM specification.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-032",
      "component": "Nozzle anti-drip valves and check valves",
      "check": [
       {
        "label": null,
        "text": "Verify anti-drip closure and correct check-valve direction with safe pressure test."
       }
      ],
      "pass": "No uncontrolled water flow after shutdown.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-035",
      "component": "GCT throat outlet / dust deposit survey",
      "check": [
       {
        "label": null,
        "text": "Check deposit and plugged hopper symptoms; enter only after cooled/confined-space permit."
       }
      ],
      "pass": "No buildup obstructing gas flow or starving dust exit.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-036",
      "component": "GCT discharge cone, airlock or screw",
      "check": [
       {
        "label": null,
        "text": "Inspect hopper level, heater, valve rotor/coupling, bearing oil and screw flight."
       }
      ],
      "pass": "Free discharge with dust containment; no material bridge.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-037",
      "component": "GCT washdown drains and condensate/effluent",
      "check": [
       {
        "label": null,
        "text": "Identify and inspect drains, wet areas, safety valves and water carryover to bag filter."
       }
      ],
      "pass": "No liquid carryover to dry collector or unsafe runoff.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-038",
      "component": "GCT manholes, nozzles and instrument flanges",
      "check": [
       {
        "label": null,
        "text": "Check bolts, gaskets, weather covers and thermowell support."
       }
      ],
      "pass": "Proper high-temperature sealing, no false-air ingress.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-039",
      "component": "GCT emergency water isolation/fire readiness",
      "check": [
       {
        "label": null,
        "text": "Verify labelled line isolators and plant-approved fail-safe state."
       }
      ],
      "pass": "Water flow stops/continues only as designed; procedure verified.",
      "freq": "Annually",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "6.3",
    "title": "C. Electrostatic precipitator (ESP) gas side and internals - if installed",
    "tasks": [
     {
      "id": "EXH-040",
      "component": "ESP casing structural shell/roof/support steel",
      "check": [
       {
        "label": null,
        "text": "Inspect roof welds, corrosion, sidewalls, gussets, access structure and deformation."
       }
      ],
      "pass": "No perforation/instability; repairs with qualified work plan.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-041",
      "component": "ESP inlet nozzle and gas turning section",
      "check": [
       {
        "label": null,
        "text": "Check dust leakage, expansion joint, baffle condition and gas distribution cross-section."
       }
      ],
      "pass": "Tight duct and no abnormal erosion / blocked entry.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-042",
      "component": "Inlet gas distribution perforated screens",
      "check": [
       {
        "label": null,
        "text": "At isolated cooled access inspect bending, broken supports, severe fouling and holes."
       }
      ],
      "pass": "Even gas entry and secure screens; renew distorted plates.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-043",
      "component": "ESP field collector plates - flatness / alignment",
      "check": [
       {
        "label": null,
        "text": "Inspect plates for bowed sections, broken hangers, misalignment and overheating."
       }
      ],
      "pass": "Design interelectrode spacing maintained; repair/replace approved parts.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-044",
      "component": "ESP discharge electrode wires/rigid frames",
      "check": [
       {
        "label": null,
        "text": "Inspect loose/broken wires, burrs, short paths, corrosion, missing weights and frame supports."
       }
      ],
      "pass": "Electrode geometry and clearance to OEM drawings; no shorting.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-045",
      "component": "Electrode tension weights / centering guides",
      "check": [
       {
        "label": null,
        "text": "Verify suspension tension, bottom weights and guides at cooled outage."
       }
      ],
      "pass": "No loose electrode or displaced guide; replace wear parts.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-046",
      "component": "ESP collecting-plate suspension hooks and bars",
      "check": [
       {
        "label": null,
        "text": "Inspect top carrying bars, clip welds, fastener locking and wear at supports."
       }
      ],
      "pass": "No cracks, failed hooks or moving plate sets.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-047",
      "component": "Interfield partitions and bypass gaps",
      "check": [
       {
        "label": null,
        "text": "Examine shell bypass leakage between fields, dead zones and partition wear."
       }
      ],
      "pass": "Designed gas distribution without unintended dust short circuit.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-048",
      "component": "ESP discharge frame support beams",
      "check": [
       {
        "label": null,
        "text": "Check tube stiffness, insulation attachment and corrosion cracks."
       }
      ],
      "pass": "Frame aligned and free from conductor contact.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-049",
      "component": "ESP guide plates / inlet diffuser / outlet baffles",
      "check": [
       {
        "label": null,
        "text": "Inspect alignment, missing bolts and erosion or plate warping."
       }
      ],
      "pass": "Uniform flow guidance and no loose metal in duct.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-050",
      "component": "ESP process doors, manholes and door gaskets",
      "check": [
       {
        "label": null,
        "text": "Inspect exterior air ingress and lock hardware; at outage inspect gasket compression."
       }
      ],
      "pass": "No uncontrolled air inleakage, doors secured.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN + STOP",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-051",
      "component": "ESP interelectrode clearances / discharge spines",
      "check": [
       {
        "label": null,
        "text": "At qualified outage measure representative spacing using OEM jigs and drawings."
       }
      ],
      "pass": "Minimum clearances comply with vendor; no distorted spines.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-053",
      "component": "ESP inlet/outlet expansion joints and tie rods",
      "check": [
       {
        "label": null,
        "text": "Inspect leak trails, fabric blisters, restraint position, bolt/gasket integrity."
       }
      ],
      "pass": "Sealed and free to thermally move; renew worn bellows.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-054",
      "component": "ESP internal corrosion / condensation pattern",
      "check": [
       {
        "label": null,
        "text": "During cool, ventilated outage inspect corrosion under wet or low-temperature zones."
       }
      ],
      "pass": "No severe wall loss; investigate process dewpoint and ingress.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-055",
      "component": "ESP field numbering and physical access control",
      "check": [
       {
        "label": null,
        "text": "Confirm each T/R set, field, rapper, isolator and hopper has unique plate/CMMS ID."
       }
      ],
      "pass": "Correct one-to-one register, no ambiguous isolation point.",
      "freq": "Annually",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-056",
      "component": "ESP access-platform anti-fall hardware",
      "check": [
       {
        "label": null,
        "text": "Check grating clips, ladders, handrail toe plates, HV access barriers."
       }
      ],
      "pass": "No access hazard; close unsafe route and repair.",
      "freq": "Monthly",
      "owner": "EH",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-057",
      "component": "ESP pressure-tight window and inspection fittings",
      "check": [
       {
        "label": null,
        "text": "Inspect sight port gaskets and covers, no unauthorized inspection openings."
       }
      ],
      "pass": "No leakage/false air, all safety locks intact.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "6.4",
    "title": "D. ESP high voltage, T/R sets, rappers and insulators - if installed",
    "tasks": [
     {
      "id": "EXH-062",
      "component": "ESP HV disconnect, earthing switch and interlocks",
      "check": [
       {
        "label": null,
        "text": "Qualified personnel verify locked isolation sequence and discharged, grounded electrodes before access."
       }
      ],
      "pass": "Positive zero-energy proof per site HV procedure; no bypassed key interlock.",
      "freq": "Event-based",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-063",
      "component": "T/R set oil, bushings, conservator and gaskets",
      "check": [
       {
        "label": null,
        "text": "Inspect exterior level, oil leaks, bushing contamination, damage and breather condition."
       }
      ],
      "pass": "Dry intact insulation and no oil leakage; dielectric test under OEM plan.",
      "freq": "Quarterly",
      "owner": "EL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-064",
      "component": "T/R enclosure cooling fan / heat exchanger",
      "check": [
       {
        "label": null,
        "text": "Check thermal alarms, airflow and cabinet temperature; overhaul safely de-energized."
       }
      ],
      "pass": "Cooling maintained, filters clean; no hotspots.",
      "freq": "Monthly",
      "owner": "EL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-065",
      "component": "T/R control cabinet, thyristor/IGBT firing unit",
      "check": [
       {
        "label": null,
        "text": "Review alarms, card failures, cooling fans, terminal heat and firmware state."
       }
      ],
      "pass": "Correct field regulation and no recurring faults; maintenance electrically isolated.",
      "freq": "Quarterly",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-066",
      "component": "HV cable, bus duct and porcelain lead-in insulator",
      "check": [
       {
        "label": null,
        "text": "Inspect accessible external seals/corrosion; perform dielectric tests by qualified HV team."
       }
      ],
      "pass": "No tracking, cracks, overflash or loose terminations.",
      "freq": "Planned stop",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-067",
      "component": "HV support insulators / compartment heaters",
      "check": [
       {
        "label": null,
        "text": "Inspect insulator cracks and dust, heater current, thermostats and moisture ingress."
       }
      ],
      "pass": "Dry insulator compartment and functioning heater; correct dewpoint.",
      "freq": "Quarterly",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-068",
      "component": "Insulator purge-air blower/filter/header",
      "check": [
       {
        "label": null,
        "text": "Where installed verify fan, filter restriction and supply pressure to HV compartments."
       }
      ],
      "pass": "Clean dry positive purge as specified, no blocked branch.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-069",
      "component": "ESP electrical earthing grids and equipment bonds",
      "check": [
       {
        "label": null,
        "text": "Qualified crew inspect continuity, corrosion and grounding points."
       }
      ],
      "pass": "Earth impedance/continuity per plant test; no loose connection.",
      "freq": "Annually",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-070",
      "component": "Collecting-plate rapper drive motors",
      "check": [
       {
        "label": null,
        "text": "Review drive duty, gearbox lubrication and sequence; inspect couplings/guards offline."
       }
      ],
      "pass": "Effective rapping without missed strokes or unsafe drive motion.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-071",
      "component": "Discharge-electrode rapper mechanisms",
      "check": [
       {
        "label": null,
        "text": "Check external gearboxes, bearings, shafts, hammer lift, links and control sequence."
       }
      ],
      "pass": "No jam or broken hammer; operate under OEM condition and permissions.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-072",
      "component": "Gas distributor/field rapper shafts and hammers",
      "check": [
       {
        "label": null,
        "text": "At outage inspect cams, link pins, wear inserts, hammer/anvil contact and spring mechanisms."
       }
      ],
      "pass": "Full specified travel, no loose/broken rapper part.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-073",
      "component": "ESP rapper controller physical cabinet and outputs",
      "check": [
       {
        "label": null,
        "text": "Inspect cabinet power supply, relays, contacts, connector corrosion and cable condition at approved isolation; event/signal accuracy checks are in the instrument appendix."
       }
      ],
      "pass": "Rapper controller cabinet, power wiring and relay outputs electrically sound after planned inspection.",
      "freq": "Quarterly",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-074",
      "component": "Rapper drive gearbox seals, bearings, oil levels",
      "check": [
       {
        "label": null,
        "text": "Inspect sight glass, breather, oil leak, heat and maintenance hours."
       }
      ],
      "pass": "Correct lubricant and no high bearing vibration.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-075",
      "component": "ESP rapper shaft penetration seals / packings",
      "check": [
       {
        "label": null,
        "text": "Look for false-air ingress or dust seepage, check gland bolts and stuffing seals offline."
       }
      ],
      "pass": "No appreciable leak and no shaft binding.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-076",
      "component": "Anti-condensation cabinet heaters / thermostat",
      "check": [
       {
        "label": null,
        "text": "Verify enclosure climate and functional thermostat switching under isolated work permit."
       }
      ],
      "pass": "No moisture buildup/shorting in cabinet.",
      "freq": "Quarterly",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-077",
      "component": "ESP access-door interlock key exchange",
      "check": [
       {
        "label": null,
        "text": "Verify door release only on proven grounded/de-energized state via authorised test."
       }
      ],
      "pass": "No bypass or shared key mismatch; restore before startup.",
      "freq": "Annually",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-078",
      "component": "ESP HV warning lamps / insulation resistance log",
      "check": [
       {
        "label": null,
        "text": "Check status indications and completed OEM-approved tests; do not test while energized."
       }
      ],
      "pass": "Alarm lamps and insulation readings valid against OEM thresholds.",
      "freq": "Quarterly",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-079",
      "component": "ESP control cable tray, glands and marshalling",
      "check": [
       {
        "label": null,
        "text": "Check heat damaged cables, water entry, terminals, labelling and shield bonding."
       }
      ],
      "pass": "No cable compromise, earth faults or orphan wire.",
      "freq": "Quarterly",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-080",
      "component": "ESP T/R surge suppression/overvoltage protection",
      "check": [
       {
        "label": null,
        "text": "Inspect surge diverters, fuses and surge counters where fitted per OEM."
       }
      ],
      "pass": "No out-of-date protective components or defeated trips.",
      "freq": "Annually",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-183",
      "component": "ESP CO-trip interlock (if ESP installed)",
      "check": [
       {
        "label": null,
        "text": "With the plant DCS / SIS owner, prove by authorised end-to-end test that ESP high voltage is switched off on high CO and that restart is blocked until CO is normal; confirm trip setpoints and analyser availability."
       }
      ],
      "pass": "HV de-energises on the CO trip within the approved time; no bypass; restart permissive works; test recorded.",
      "freq": "Planned stop",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "6.5",
    "title": "E. ESP dust hoppers, heating, discharge and material return - if installed",
    "tasks": [
     {
      "id": "EXH-082",
      "component": "ESP hopper shell, taper and support attachments",
      "check": [
       {
        "label": null,
        "text": "Check holes, cracks, weld damage, flange seams and dust trails from safe position."
       }
      ],
      "pass": "No ash escape, structural corrosion or plugging risk.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-084",
      "component": "ESP hopper heater tapes/elements",
      "check": [
       {
        "label": null,
        "text": "Review heater current and thermostat, inspect leads and insulation with isolation."
       }
      ],
      "pass": "Dry material flow and protection against condensation.",
      "freq": "Quarterly",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-086",
      "component": "ESP hopper access doors and gaskets",
      "check": [
       {
        "label": null,
        "text": "Check seal condition, bolts, lock/interlock and dust ingress."
       }
      ],
      "pass": "No leakage, no access without high-voltage and thermal isolation.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-087",
      "component": "ESP hopper discharge rotary airlock",
      "check": [
       {
        "label": null,
        "text": "Inspect blades, bearing seals, motor/gearbox, rotor/casing clearance and upstream gate."
       }
      ],
      "pass": "Rotation correct, dust discharged, no uncontrolled false-air ingress.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-088",
      "component": "ESP hopper screw conveyor or chain conveyor",
      "check": [
       {
        "label": null,
        "text": "Inspect flight/bush, wear liner, bearing lubrication and take-up."
       }
      ],
      "pass": "No packing, bent screw or failed discharge route.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-089",
      "component": "ESP double-flap / pneumatic gate valve",
      "check": [
       {
        "label": null,
        "text": "Verify upstream/downstream flap seating, actuator seal, pilot solenoid and feedback."
       }
      ],
      "pass": "Material discharged without loss of gas sealing.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-090",
      "component": "ESP pneumatic dust conveying lines",
      "check": [
       {
        "label": null,
        "text": "Check erosion elbows, flange wear, conveying pressure, air dryer and non-return valves."
       }
      ],
      "pass": "Stable dust transport with no leak or blockage.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-091",
      "component": "ESP ash receiver / intermediate bin and silo",
      "check": [
       {
        "label": null,
        "text": "Check level, vent filter, overflow, rotary feeder and dust spillage."
       }
      ],
      "pass": "Not overfilled; vent and discharge operational.",
      "freq": "Weekly",
      "owner": "OP",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-092",
      "component": "ESP return-dust routing diverter",
      "check": [
       {
        "label": null,
        "text": "Trace dust return to meal/raw mill/outlet per P&ID, inspect valve and chute isolation."
       }
      ],
      "pass": "Dust destination approved and no process contamination.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-093",
      "component": "ESP hopper vibrator / fluidisation pads",
      "check": [
       {
        "label": null,
        "text": "Inspect motor, air supply, insulation and seals where fitted."
       }
      ],
      "pass": "No bridge; energized only as approved by OEM.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-094",
      "component": "ESP hopper flange gasket and isolation slide",
      "check": [
       {
        "label": null,
        "text": "Inspect gate seal, access, flange bolts and wear."
       }
      ],
      "pass": "Controlled isolation and no ash leakage.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-095",
      "component": "ESP hopper explosion/pressure relief devices",
      "check": [
       {
        "label": null,
        "text": "Only if required by engineering: inspect labels, vent path and certificate."
       }
      ],
      "pass": "Undamaged protective component, no obstruction or unauthorized replacement.",
      "freq": "Annually",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-097",
      "component": "ESP dust screw bearing seal and drive MCB",
      "check": [
       {
        "label": null,
        "text": "Review overload/trip and external housing heat; inspect drive safely."
       }
      ],
      "pass": "Drive available with no material accumulation near hot components.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "6.6",
    "title": "F. Main kiln / preheater bag filter casing, bags and clean/dirty plenums - if installed",
    "tasks": [
     {
      "id": "EXH-098",
      "component": "Main bag filter gas-inlet isolation and hot-gas protective dampers",
      "check": [
       {
        "label": null,
        "text": "Inspect damper housing, blade, actuator, seats, fail position and mechanical interlock parts at authorized isolation; thermal transmitters and trip-signal tests are separate."
       }
      ],
      "pass": "Isolation/protective damper structure, seating and fail- position hardware conform to approved cause-and-effect arrangement.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-099",
      "component": "Baghouse dirty-air entry and diffuser",
      "check": [
       {
        "label": null,
        "text": "Inspect inlet abrasion, dust buildup, loose baffles, flange and upstream ducts during isolated access."
       }
      ],
      "pass": "Even flow and no large deposit/rubbing or air short circuit.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-100",
      "component": "Baghouse outer casing roof/walls/supports",
      "check": [
       {
        "label": null,
        "text": "Inspect rust, buckling, cracked welds and loose stiffeners."
       }
      ],
      "pass": "No gas leak or structural defect; engineer repairs.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-101",
      "component": "Baghouse internal chamber partition and baffles",
      "check": [
       {
        "label": null,
        "text": "Inspect bypass paths, leakage from dirty to clean side, corroded welds and warped partitions."
       }
      ],
      "pass": "Separation maintained; clean plenum free of collected dust.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-102",
      "component": "Filter bags - fabric surface, seam and dust cake",
      "check": [
       {
        "label": null,
        "text": "Inspect sample bags for abrasion, holes, blinding, embrittlement and chemical attack at isolated cooled stop."
       }
      ],
      "pass": "No failed or damaged fabric; renew approved media.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-103",
      "component": "Filter bag top cuffs, snap bands and venturi",
      "check": [
       {
        "label": null,
        "text": "Verify correct attachment, seal, anti-collapse ring and venturi alignment."
       }
      ],
      "pass": "No annular bypass; bag seated and secured.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-104",
      "component": "Filter cages - straightness, wire corrosion and welded joints",
      "check": [
       {
        "label": null,
        "text": "Inspect bent/corroded wire or broken support rings and top attachment."
       }
      ],
      "pass": "No broken cage damaging bag; replace defective cages.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-105",
      "component": "Tubesheet - cracks, corrosion, seals and welds",
      "check": [
       {
        "label": null,
        "text": "Inspect clean-side dust, open holes, warping and tube-sheet seal condition."
       }
      ],
      "pass": "No dust breakthrough/bag seating bypass.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-106",
      "component": "Baghouse clean-air plenum and outlet manifold",
      "check": [
       {
        "label": null,
        "text": "Check clean-side dust deposits and corrosion at isolated cooled outage."
       }
      ],
      "pass": "No accumulation suggesting bag leak or gasket failure.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-111",
      "component": "Baghouse fire/hot particle protection",
      "check": [
       {
        "label": null,
        "text": "Confirm installed spark/hot-particle detector, temperature alarms and isolation interfaces."
       }
      ],
      "pass": "Correct alerts and protection; no bypassed safeties.",
      "freq": "Quarterly",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-112",
      "component": "Baghouse compartment isolation dampers",
      "check": [
       {
        "label": null,
        "text": "For offline-clean or multi-chamber units verify seal, actuator and correct service mode."
       }
      ],
      "pass": "Each compartment isolated according to OEM sequence.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-113",
      "component": "Baghouse access door gasket/clamp/hinges",
      "check": [
       {
        "label": null,
        "text": "Inspect compressed seals, handles and clamp bars for leakage and fastener loss."
       }
      ],
      "pass": "Tight closure without false air or dust emission.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-114",
      "component": "Baghouse thermal insulation and trace heating",
      "check": [
       {
        "label": null,
        "text": "Check wet cladding, insulation settlement and cold spots causing condensation."
       }
      ],
      "pass": "No cold bridges and no exposed hot casing.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-115",
      "component": "Baghouse structural expansion frames and sliding shoes",
      "check": [
       {
        "label": null,
        "text": "Check thermal movement, tie rods, foundations and hold- down studs."
       }
      ],
      "pass": "Structure free to expand and safely supported.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-116",
      "component": "Baghouse roof weather covers and vent fittings",
      "check": [
       {
        "label": null,
        "text": "Check roof penetration seals, rain ingress, relief fittings and vent guards."
       }
      ],
      "pass": "No water ingress to bags/electricals.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-117",
      "component": "Baghouse combustion/dust hazard classification",
      "check": [
       {
        "label": null,
        "text": "Confirm hazard assessment, area electrical rating and protection devices with EHS."
       }
      ],
      "pass": "Protection installed if required; no unapproved ignition source.",
      "freq": "Annually",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-118",
      "component": "Baghouse filter media life and replacement record",
      "check": [
       {
        "label": null,
        "text": "Record bag material, temperature class, manufacturing batch and failure history."
       }
      ],
      "pass": "Media selected for actual gas chemistry, dewpoint and service.",
      "freq": "Annually",
      "owner": "REL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-119",
      "component": "Baghouse acid condensate/corrosion survey",
      "check": [
       {
        "label": null,
        "text": "Where low temperature/wet conditions occur, inspect plenum and drains after cool shutdown."
       }
      ],
      "pass": "No persistent wet cake or shell attack; address dewpoint/cooling controls.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "6.7",
    "title": "G. Main baghouse cleaning system, compressed-air headers and valves - if pulse-jet",
    "tasks": [
     {
      "id": "EXH-120",
      "component": "Bag-filter pulse sequencing controller hardware",
      "check": [
       {
        "label": null,
        "text": "Inspect controller enclosure, wiring, terminal blocks, output relays and power supply at safe isolation; dP setpoints and response tests are in the instrument appendix."
       }
      ],
      "pass": "Controller power, relay hardware and terminations sound; physical output modules and enclosure intact.",
      "freq": "Weekly",
      "owner": "EL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-121",
      "component": "Pulse diaphragm valve body",
      "check": [
       {
        "label": null,
        "text": "Inspect external leaks and prove response safely; remove only after isolating compressed air."
       }
      ],
      "pass": "Opens/closes reliably; no stuck open bleed.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-122",
      "component": "Diaphragm membranes and spring assemblies",
      "check": [
       {
        "label": null,
        "text": "Disassemble at stop and inspect tears, fatigue, hardening and debris in valve seats."
       }
      ],
      "pass": "Flexible intact membrane and correct spring/seat.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-123",
      "component": "Pulse-cleaning pilot valve bodies and solenoid coils",
      "check": [
       {
        "label": null,
        "text": "Inspect solenoid coil housing, connector, valve seat, pilot exhaust and diaphragm actuator after compressed-air and electrical isolation; sequence feedback testing is in sensor appendix."
       }
      ],
      "pass": "No failed coil or pilot leak; output matches controller command.",
      "freq": "Quarterly",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-124",
      "component": "Pulse-air receiver, drain and relief-valve hardware",
      "check": [
       {
        "label": null,
        "text": "Inspect pressure vessel shell, drain, fittings, relief-device certification and corrosion; pressure-gauge calibration is in instrument appendix."
       }
      ],
      "pass": "Receiver integrity and statutory documentation current; drains/valve/fittings leak-tight and relief certified.",
      "freq": "Annually",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-125",
      "component": "Pulse air compressor/motor and drive",
      "check": [
       {
        "label": null,
        "text": "Where dedicated compressor is fitted, inspect motor overload, intake filter, lubrication and air dryer."
       }
      ],
      "pass": "Clean dry air supply, normal temperature/current and standby availability.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-126",
      "component": "Pulse-air dryer / separator / filter elements",
      "check": [
       {
        "label": null,
        "text": "Inspect dryer dewpoint, differential pressure, water drain and filters."
       }
      ],
      "pass": "No liquid carryover into pilot and pulse valves.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-127",
      "component": "Pulse manifold / distribution header leak test",
      "check": [
       {
        "label": null,
        "text": "With approved safe procedure, listen for leaks and check flange unions, supports and corrosion."
       }
      ],
      "pass": "No air waste/leakage or damaged header.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-128",
      "component": "Blowpipes / injector jets / nozzles",
      "check": [
       {
        "label": null,
        "text": "Inspect alignment to venturi and holes, jet pipe clamps, corrosion or blockage offline."
       }
      ],
      "pass": "Proper centered pulse into each bag row.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-129",
      "component": "Pulse flexible pilot tubing, fittings and tees",
      "check": [
       {
        "label": null,
        "text": "Check tubing heat aging, loose ferrules, crushed bends and leak traces."
       }
      ],
      "pass": "All pilots tight and protected, correct pulse response.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-130",
      "component": "Pulse line isolation valve and nonreturn check",
      "check": [
       {
        "label": null,
        "text": "Verify shutoff, lockability and no reverse flow; maintain during shutoff."
       }
      ],
      "pass": "Manifold fully isolated for safe repair and check valve seated.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-132",
      "component": "Pulse-air pressure relief and condensate drain",
      "check": [
       {
        "label": null,
        "text": "Inspect drain and relief approval, isolation labeling and guarding."
       }
      ],
      "pass": "No failed relief device or blocked drain.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-135",
      "component": "Pulse header fastening and structural isolation",
      "check": [
       {
        "label": null,
        "text": "Inspect U-bolts, vibration mounts and flange bolts, especially in hot service."
       }
      ],
      "pass": "No fatigue cracks or pipe movement.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-136",
      "component": "Cleaning type identification (pulse/reverse/shaker)",
      "check": [
       {
        "label": null,
        "text": "Confirm actual baghouse cleaning principle before applying pulse-specific tasks."
       }
      ],
      "pass": "Uninstalled sub-system marked NA, alternative type given its OEM plan.",
      "freq": "Annually",
      "owner": "REL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-137",
      "component": "Offline reverse-air / mechanical shaker system (if fitted)",
      "check": [
       {
        "label": null,
        "text": "Inspect dedicated fan, damper, shaker bearings and motion controls as relevant."
       }
      ],
      "pass": "Effective cleaning without bag damage, under OEM plan.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "6.8",
    "title": "H. Baghouse hoppers, dust discharge and return handling - if installed",
    "tasks": [
     {
      "id": "EXH-138",
      "component": "Main filter hopper cones and dust bridges",
      "check": [
       {
        "label": null,
        "text": "Check external hopper shell, level alarm, heat tracing and bulk dust discharge trend."
       }
      ],
      "pass": "No dust flooding into bag compartment; prevent unsafe hopper entry.",
      "freq": "Daily",
      "owner": "OP",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-139",
      "component": "Hopper heaters / local thermostats",
      "check": [
       {
        "label": null,
        "text": "Check heater power, overtemp protection, insulation and thermostat command."
       }
      ],
      "pass": "Dry dust flow, no heater ground fault.",
      "freq": "Quarterly",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-140",
      "component": "Hopper rotary airlock - rotor and tip seals",
      "check": [
       {
        "label": null,
        "text": "Check motor current, torque, shaft bearings, tip clearance and air leakage offline."
       }
      ],
      "pass": "Free rotor and acceptable sealing; repair worn tips.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-141",
      "component": "Hopper double-dump valve/pendulum flaps",
      "check": [
       {
        "label": null,
        "text": "Inspect motion, counterweight, seals, springs, seat wear and cycle feedback."
       }
      ],
      "pass": "Reliable dust discharge without false-air path.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-142",
      "component": "Hopper screw conveyor flights / shaft seals",
      "check": [
       {
        "label": null,
        "text": "Inspect wear, loose flights, hanger bearings, torque limiter and outlet seal."
       }
      ],
      "pass": "No jam or dust leakage; replace worn screws.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-143",
      "component": "Hopper chain/drag conveyors if fitted",
      "check": [
       {
        "label": null,
        "text": "Inspect chain pitch, flights, sprockets, take-up and drive coupling."
       }
      ],
      "pass": "Smooth conveying without hanging; OEM take-up setting.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-144",
      "component": "Hopper pneumatic conveying airlocks and diverters",
      "check": [
       {
        "label": null,
        "text": "Inspect air supply, pressure, pipe elbows, couplings, solenoid valves and routing."
       }
      ],
      "pass": "No dust discharge buildup or blocked transfer to collection silo.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-145",
      "component": "Dust transport blower or pump motor and gearbox",
      "check": [
       {
        "label": null,
        "text": "Check current, vibration, inlet filter, bearings, oil and hoses."
       }
      ],
      "pass": "Stable conveyance, no overheating or leakage.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-146",
      "component": "Dust return bin level, vent and extract gate",
      "check": [
       {
        "label": null,
        "text": "Monitor level, air pad pressure, discharge status and gasket condition where installed."
       }
      ],
      "pass": "No overfill or unstable return to approved destination.",
      "freq": "Weekly",
      "owner": "OP",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-147",
      "component": "Dust return branch flange seals and expansion",
      "check": [
       {
        "label": null,
        "text": "Inspect return duct/pipe leak tracks, flexible couplings, hanger and isolation gates."
       }
      ],
      "pass": "No powder emission or blockage.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-148",
      "component": "Hopper inspection doors / pressure-relief devices",
      "check": [
       {
        "label": null,
        "text": "Check closures, gasket and any code-required protection from external safe position."
       }
      ],
      "pass": "Closed with valid certification and vent path.",
      "freq": "Quarterly",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-149",
      "component": "Baghouse dust mass-balance and hopper inventory",
      "check": [
       {
        "label": null,
        "text": "Reconcile dust extraction run hours and excess hopper level alarms."
       }
      ],
      "pass": "No silent hopper plugging; any unusual carryover investigated.",
      "freq": "Monthly",
      "owner": "OP",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-150",
      "component": "Baghouse ash-handling motor starter and overload",
      "check": [
       {
        "label": null,
        "text": "Review trip history, earthing and overload settings; inspect offline."
       }
      ],
      "pass": "Correct protection and no unreported trips.",
      "freq": "Quarterly",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "6.9",
    "title": "I. Exhaust fans, post-collector ducts, stack and emission instrumentation",
    "tasks": [
     {
      "id": "EXH-151",
      "component": "Post-collector fan identity / process position",
      "check": [
       {
        "label": null,
        "text": "Verify whether fan is pre/post ESP/filter and raw-mill circuit; establish exact motor and damper IDs."
       }
      ],
      "pass": "No false assumption that every installation has a separate filter fan.",
      "freq": "Annually",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-152",
      "component": "Additional filter/exhaust fan impeller",
      "check": [
       {
        "label": null,
        "text": "Where installed trend current/vibration and inspect erosion/cracks and deposits at shutdown."
       }
      ],
      "pass": "No imbalance, excessive clearance or cracked hub.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN + STOP",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-153",
      "component": "Filter fan bearings/grease/oil and shaft seals",
      "check": [
       {
        "label": null,
        "text": "Inspect housing vibration/temperature, lubricator, shaft seal and cooling."
       }
      ],
      "pass": "Normal trend and lubricant for duty; bearings secure.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-154",
      "component": "Filter fan motor/VFD/MCC",
      "check": [
       {
        "label": null,
        "text": "Review current/power, running status, drive fault, airflow and cable terminations."
       }
      ],
      "pass": "No overcurrent/tripped cooling; correct protection.",
      "freq": "Weekly",
      "owner": "EL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-155",
      "component": "Filter fan coupling, guards and foundation",
      "check": [
       {
        "label": null,
        "text": "Check cracked grout, guard bolts, witness marks and vibration with safe access."
       }
      ],
      "pass": "No relative movement or loose guard; repair isolated.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-156",
      "component": "Filter fan outlet damper and actuator",
      "check": [
       {
        "label": null,
        "text": "Check shaft seals, bearing/valve seats, travel feedback, pneumatic tubing or motor actuator."
       }
      ],
      "pass": "Authorized smooth travel and correct position.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-157",
      "component": "Fan inlet silencer and inlet guide vane",
      "check": [
       {
        "label": null,
        "text": "If installed inspect liner, fasteners, rust and alignment."
       }
      ],
      "pass": "No loose silencer or jammed vanes.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-158",
      "component": "Fan expansion connectors / compensator boots",
      "check": [
       {
        "label": null,
        "text": "Inspect external tears, fatigue, bolt gaskets, excessive thermal shift."
       }
      ],
      "pass": "Continuous gas sealing, no binding.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-159",
      "component": "Post-filter outlet clean-gas duct and isolation",
      "check": [
       {
        "label": null,
        "text": "Look for corrosion, air ingress, water condensate and leak paths to stack."
       }
      ],
      "pass": "Tight ducts and valid authorized routing.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-160",
      "component": "Stack shell corrosion and vertical welds",
      "check": [
       {
        "label": null,
        "text": "Inspect external rust, distortion, thermal expansion and access platform condition."
       }
      ],
      "pass": "No wall loss/unsafe structural component; structural engineer review.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-161",
      "component": "Stack rain hood / drains / low point water trap",
      "check": [
       {
        "label": null,
        "text": "Inspect drainage, rain entry and condensate collection where designed."
       }
      ],
      "pass": "Free drainage and no corrosion accelerating wet spots.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-162",
      "component": "Stack guy wires / anchor blocks (if fitted)",
      "check": [
       {
        "label": null,
        "text": "Check corrosion, anchor tension/witness marks and protective coating."
       }
      ],
      "pass": "Acceptable engineered tension and integrity.",
      "freq": "Annually",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-163",
      "component": "Stack duct/stack access flanges and test ports",
      "check": [
       {
        "label": null,
        "text": "Verify leak-tight sample flanges, bolting, platform and safe access."
       }
      ],
      "pass": "Sampling stations serviceable, no hot-gas escape.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-167",
      "component": "Emission control emergency operation / power loss",
      "check": [
       {
        "label": null,
        "text": "Verify response of fans, collectors, bypass dampers and emission alarms per cause-effect."
       }
      ],
      "pass": "Permissives and safe stop tested under authorized exercise.",
      "freq": "Annually",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-168",
      "component": "Dust-control gas temperature/dewpoint risk",
      "check": [
       {
        "label": null,
        "text": "Check filter condition vs kiln load, raw-mill off mode and water spray behavior."
       }
      ],
      "pass": "No damaging condensation/overheat episodes.",
      "freq": "Daily",
      "owner": "OP",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "6.10",
    "title": "J. Filter utilities, relief, water/air and cross-system safeguards",
    "tasks": [
     {
      "id": "EXH-169",
      "component": "Plant compressed air pressure receiver and certification",
      "check": [
       {
        "label": null,
        "text": "Inspect receiver register, drain, relief certificate, pressure gauge and corrosion."
       }
      ],
      "pass": "Safe dry supply, no expired pressure-vessel checks.",
      "freq": "Annually",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-170",
      "component": "Compressed air dryer and coalescing filters",
      "check": [
       {
        "label": null,
        "text": "Check dewpoint, condensate purge, filtration restriction and controller alarm."
       }
      ],
      "pass": "Clean dry air to pulse valves, air cannons and actuators.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-171",
      "component": "Instrument-air distribution root valves, fittings and branches",
      "check": [
       {
        "label": null,
        "text": "Inspect air distribution valves, regulators, pipe fittings, drains, hoses and leaks; any pressure/dewpoint transmitters are in the sensor appendix."
       }
      ],
      "pass": "Identified air valves, branches, drains, fittings and tubes mechanically secure, accessible and leak-tight.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-172",
      "component": "Gas treatment cooling water pumps and strainers",
      "check": [
       {
        "label": null,
        "text": "Where installed check pump, suction strainer, seals, isolation valves and header pressure."
       }
      ],
      "pass": "Water flow within approved band; no cavitation or coolant leak.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-173",
      "component": "Cooling water heat exchanger / fouling",
      "check": [
       {
        "label": null,
        "text": "Check pressure drop, approach temperature, leak detection and bypass."
       }
      ],
      "pass": "No cross-contamination or restricted heat transfer.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-174",
      "component": "Main collector access and confined-space entry",
      "check": [
       {
        "label": null,
        "text": "Verify permit, oxygen/CO monitoring, inert gas hazards, cooled temperature and safe rescue plan."
       }
      ],
      "pass": "Never enter until gas/isolation/HV tests signed off.",
      "freq": "Event-based",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-175",
      "component": "ESP HV stored-energy discharge / grounding",
      "check": [
       {
        "label": null,
        "text": "Verify written authorized switching, earthing and test-before-touch record."
       }
      ],
      "pass": "Field proven de-energized and grounded; no access without clearance.",
      "freq": "Event-based",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-176",
      "component": "Dust ignition and fire protection audit",
      "check": [
       {
        "label": null,
        "text": "Confirm coal/raw-meal dust nature, hot particle/fire controls, spark detection and extinguishing design if required."
       }
      ],
      "pass": "Applicable hazard assessment current; no assumed explosion-protection hardware.",
      "freq": "Annually",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-177",
      "component": "Spare filter bags, pulse diaphragms, ESP electrodes",
      "check": [
       {
        "label": null,
        "text": "Confirm approved materials, critical stock, documented type/size and environmental storage."
       }
      ],
      "pass": "Spares fit actual OEM and service rating; no substitution without engineering.",
      "freq": "Quarterly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-178",
      "component": "Dust collector inspection scaffold and lifting points",
      "check": [
       {
        "label": null,
        "text": "Validate certified beam/lug locations, access ramps and controlled lifting of plate/bag assemblies."
       }
      ],
      "pass": "No improvised lift on duct or roof.",
      "freq": "Event-based",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-179",
      "component": "Filter fan / ID fan operating point review",
      "check": [
       {
        "label": null,
        "text": "Reconcile fan curve, process pressure drop, speed and gas density before any rebalance."
       }
      ],
      "pass": "Stable process without exceeding fan limits; no unauthorized setpoint change.",
      "freq": "Quarterly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-180",
      "component": "ESP/baghouse operational responsibility",
      "check": [
       {
        "label": null,
        "text": "Assign owning engineer, route IDs, vendor manual and permit lists for each confirmed collector."
       }
      ],
      "pass": "CMMS ownership and service plans complete before Rev.01 field issue.",
      "freq": "Annually",
      "owner": "REL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-181",
      "component": "Dust discharge valve/flange/coupling asset census",
      "check": [
       {
        "label": null,
        "text": "Walk down and log each hopper airlock, conveyor, butterfly valve, check valve, flange, reducer and sampling fitting."
       }
      ],
      "pass": "No untagged part; task performed per unique physical asset.",
      "freq": "Annually",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "EXH-182",
      "component": "Gas-treatment overhaul spare gasket/seal kit",
      "check": [
       {
        "label": null,
        "text": "Review temperature/chemical grade, serial compatibility and shelf life of stored gaskets, packing and O-rings."
       }
      ],
      "pass": "Approved spare matches actual service and material rating.",
      "freq": "Annually",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 },
 {
  "code": "KLN-01",
  "title": "Rotary kiln, drives and auxiliaries",
  "groups": [
   {
    "num": "7.1",
    "title": "Kiln inlet chamber, seal, meal inlet and gas analyser",
    "tasks": [
     {
      "id": "KLN-001",
      "component": "Stationary kiln smoke/inlet chamber shell",
      "check": [
       {
        "label": null,
        "text": "Examine hot gas leakage, cracks, external hot patches and casing deformation."
       }
      ],
      "pass": "No exposed-hot spots or leaks; plan refractory repair.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-002",
      "component": "Inlet meal chute / duct / feed spout",
      "check": [
       {
        "label": null,
        "text": "Monitor feed blockage, buildup, support and sealing; inspect inside after cool down."
       }
      ],
      "pass": "Clear passage, intact liner and gaskets.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN + STOP",
      "scope": "BASE"
     },
     {
      "id": "KLN-003",
      "component": "Inlet seal graphite / lamella / labyrinth elements",
      "check": [
       {
        "label": null,
        "text": "Inspect external leakage, dust trails, seal preload and wear indicator where fitted."
       }
      ],
      "pass": "Leakage normal per OEM; repair failed elements on stop.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-004",
      "component": "Inlet seal retaining rings / springs / bolting",
      "check": [
       {
        "label": null,
        "text": "Check spring/hanger hardware and clearances at shutdown."
       }
      ],
      "pass": "Uniform preload, no missing ring or spring.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-005",
      "component": "Inlet chamber manways / flameproof gaskets",
      "check": [
       {
        "label": null,
        "text": "Check latch integrity, leak streaks, thermal shields and access signs."
       }
      ],
      "pass": "Closed tight with no hot-gas escape.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-010",
      "component": "Smoke chamber refractory / anchors",
      "check": [
       {
        "label": null,
        "text": "Inspect thickness/erosion during cool outage, patch castable and anchors."
       }
      ],
      "pass": "No loose lining/metal exposed; kiln startup approved.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-011",
      "component": "Riser-to-inlet flanges / expansion seals",
      "check": [
       {
        "label": null,
        "text": "Examine exterior false-air stains, misalignment and bolts."
       }
      ],
      "pass": "Correct sealed connection; replace gasket under isolation.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "7.2",
    "title": "Rotating shell, refractory, shell scanner and tyres",
    "tasks": [
     {
      "id": "KLN-012",
      "component": "Kiln shell plates / circumferential welds",
      "check": [
       {
        "label": null,
        "text": "Inspect thermal map, distortion/ovalization and NDT of suspect welds at stop."
       }
      ],
      "pass": "No structural crack / abnormal deformation; engineering acceptance.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN + STOP",
      "scope": "BASE"
     },
     {
      "id": "KLN-013",
      "component": "Refractory brick lining / joints",
      "check": [
       {
        "label": null,
        "text": "Inspect lining, rings, coating and loss hot spots at shutdown."
       }
      ],
      "pass": "Thickness and lining anchorage to OEM approved limits.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-014",
      "component": "Refractory metal anchors / castable sectors",
      "check": [
       {
        "label": null,
        "text": "Inspect corrosion, anchor fatigue and detached castable on planned stop."
       }
      ],
      "pass": "Secure anchors, no shell exposure or loose fragments.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-017",
      "component": "Tyre 1 / retaining bars / filler bars",
      "check": [
       {
        "label": null,
        "text": "Check tyre creep, retaining plates, filler bar contact and tyre-to-shell lubrication."
       }
      ],
      "pass": "Within OEM creep/gap band; rising slip requires alignment review.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-018",
      "component": "Tyre 2 / retaining bars / filler bars",
      "check": [
       {
        "label": null,
        "text": "Check tyre creep, retaining plates, filler bar contact and tyre-to-shell lubrication."
       }
      ],
      "pass": "Within OEM creep/gap band; rising slip requires alignment review.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-019",
      "component": "Tyre 3 / retaining bars / filler bars",
      "check": [
       {
        "label": null,
        "text": "Check tyre creep, retaining plates, filler bar contact and tyre-to-shell lubrication."
       }
      ],
      "pass": "Within OEM creep/gap band; rising slip requires alignment review.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-020",
      "component": "Tyre face / roller wear profile",
      "check": [
       {
        "label": null,
        "text": "Examine banding, spalling, pitting, scoring and edge contact from safe observation."
       }
      ],
      "pass": "No severe profile loss, galling or metal breakage; call kiln OEM.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-021",
      "component": "Tyre mounting pads / retaining bolts",
      "check": [
       {
        "label": null,
        "text": "Inspect looseness indicators, welds and stop blocks at shutdown."
       }
      ],
      "pass": "No loose pads/wedge/retainer; use approved repair technique.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-022",
      "component": "Tyre thermal expansion / fit",
      "check": [
       {
        "label": null,
        "text": "Trend migration at comparable running temp and verify reference targets."
       }
      ],
      "pass": "Stable under equal load/heat; escalate sudden change.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-116",
      "component": "Kiln hot alignment and shell ovality survey",
      "check": [
       {
        "label": null,
        "text": "Commission a specialist hot-kiln alignment survey (roller positions, axis, tyre clearance) and shell ovality measurement at each support station."
       }
      ],
      "pass": "Kiln axis, roller settings and ovality within kiln OEM limits; corrective roller adjustment only per engineered survey.",
      "freq": "1–2 years",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.3",
    "title": "Support station 1 - roller mechanical, bearing A/B and oil assemblies",
    "tasks": [
     {
      "id": "KLN-023",
      "component": "Station 1 left roller tread / shell contact",
      "check": [
       {
        "label": null,
        "text": "Examine contact band, spalling/uneven wear and skew signs at safe distance."
       }
      ],
      "pass": "Correct tracking; engineer-approved roller alignment only after survey.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-024",
      "component": "Station 1 right roller tread / shell contact",
      "check": [
       {
        "label": null,
        "text": "Examine contact band, spalling/uneven wear and skew signs at safe distance."
       }
      ],
      "pass": "Correct tracking; engineer-approved roller alignment only after survey.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-025",
      "component": "Station 1 left bearing A / B",
      "check": [
       {
        "label": null,
        "text": "Compare temperature/vibration trend, housing seals and fasteners."
       }
      ],
      "pass": "Both readings consistent with load and OEM limits.",
      "freq": "Daily",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-026",
      "component": "Station 1 right bearing A / B",
      "check": [
       {
        "label": null,
        "text": "Compare temperature/vibration trend, housing seals and fasteners."
       }
      ],
      "pass": "Both readings consistent with load and OEM limits.",
      "freq": "Daily",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-027",
      "component": "Station 1 roller oil-bath reservoir, sight glasses and breathers",
      "check": [
       {
        "label": null,
        "text": "Check oil-bath vessel, sight glasses, caps and drain fittings for mechanical integrity; low-level switch proof is separate."
       }
      ],
      "pass": "Correct oil level/grade; alarm verified after stop.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-028",
      "component": "Station 1 roller bearing bolts / foundations",
      "check": [
       {
        "label": null,
        "text": "Inspect grout, chock/soleplate, anchor studs and shim movement."
       }
      ],
      "pass": "No uplift/cracked grout or hot bearing housing.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-029",
      "component": "Station 1 roller adjustment screws / locks",
      "check": [
       {
        "label": null,
        "text": "Inspect witness marks, grease, thread protection and tie- down hardware."
       }
      ],
      "pass": "Alignment adjustments locked and documented; no unauthorized turning.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.4",
    "title": "Support station 2 - roller mechanical, bearing A/B and oil assemblies",
    "tasks": [
     {
      "id": "KLN-031",
      "component": "Station 2 left roller tread / shell contact",
      "check": [
       {
        "label": null,
        "text": "Examine contact band, spalling/uneven wear and skew signs at safe distance."
       }
      ],
      "pass": "Correct tracking; engineer-approved roller alignment only after survey.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-032",
      "component": "Station 2 right roller tread / shell contact",
      "check": [
       {
        "label": null,
        "text": "Examine contact band, spalling/uneven wear and skew signs at safe distance."
       }
      ],
      "pass": "Correct tracking; engineer-approved roller alignment only after survey.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-033",
      "component": "Station 2 left bearing A / B",
      "check": [
       {
        "label": null,
        "text": "Compare temperature/vibration trend, housing seals and fasteners."
       }
      ],
      "pass": "Both readings consistent with load and OEM limits.",
      "freq": "Daily",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-034",
      "component": "Station 2 right bearing A / B",
      "check": [
       {
        "label": null,
        "text": "Compare temperature/vibration trend, housing seals and fasteners."
       }
      ],
      "pass": "Both readings consistent with load and OEM limits.",
      "freq": "Daily",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-035",
      "component": "Station 2 roller oil-bath reservoir, sight glasses and breathers",
      "check": [
       {
        "label": null,
        "text": "Check oil-bath vessel, sight glasses, caps and drain fittings for mechanical integrity; low-level switch proof is separate."
       }
      ],
      "pass": "Correct oil level/grade; alarm verified after stop.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-036",
      "component": "Station 2 roller bearing bolts / foundations",
      "check": [
       {
        "label": null,
        "text": "Inspect grout, chock/soleplate, anchor studs and shim movement."
       }
      ],
      "pass": "No uplift/cracked grout or hot bearing housing.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-037",
      "component": "Station 2 roller adjustment screws / locks",
      "check": [
       {
        "label": null,
        "text": "Inspect witness marks, grease, thread protection and tie- down hardware."
       }
      ],
      "pass": "Alignment adjustments locked and documented; no unauthorized turning.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.5",
    "title": "Support station 3 - roller mechanical, bearing A/B and oil assemblies",
    "tasks": [
     {
      "id": "KLN-039",
      "component": "Station 3 left roller tread / shell contact",
      "check": [
       {
        "label": null,
        "text": "Examine contact band, spalling/uneven wear and skew signs at safe distance."
       }
      ],
      "pass": "Correct tracking; engineer-approved roller alignment only after survey.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-040",
      "component": "Station 3 right roller tread / shell contact",
      "check": [
       {
        "label": null,
        "text": "Examine contact band, spalling/uneven wear and skew signs at safe distance."
       }
      ],
      "pass": "Correct tracking; engineer-approved roller alignment only after survey.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-041",
      "component": "Station 3 left bearing A / B",
      "check": [
       {
        "label": null,
        "text": "Compare temperature/vibration trend, housing seals and fasteners."
       }
      ],
      "pass": "Both readings consistent with load and OEM limits.",
      "freq": "Daily",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-042",
      "component": "Station 3 right bearing A / B",
      "check": [
       {
        "label": null,
        "text": "Compare temperature/vibration trend, housing seals and fasteners."
       }
      ],
      "pass": "Both readings consistent with load and OEM limits.",
      "freq": "Daily",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-043",
      "component": "Station 3 roller oil-bath reservoir, sight glasses and breathers",
      "check": [
       {
        "label": null,
        "text": "Check oil-bath vessel, sight glasses, caps and drain fittings for mechanical integrity; low-level switch proof is separate."
       }
      ],
      "pass": "Correct oil level/grade; alarm verified after stop.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-044",
      "component": "Station 3 roller bearing bolts / foundations",
      "check": [
       {
        "label": null,
        "text": "Inspect grout, chock/soleplate, anchor studs and shim movement."
       }
      ],
      "pass": "No uplift/cracked grout or hot bearing housing.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-045",
      "component": "Station 3 roller adjustment screws / locks",
      "check": [
       {
        "label": null,
        "text": "Inspect witness marks, grease, thread protection and tie- down hardware."
       }
      ],
      "pass": "Alignment adjustments locked and documented; no unauthorized turning.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.6",
    "title": "Main drive motor, reduction gearbox, pinion and girth gear",
    "tasks": [
     {
      "id": "KLN-047",
      "component": "Main motor casing / fan guard / cooling",
      "check": [
       {
        "label": null,
        "text": "Inspect airflow, external condition and thermal image from safe area."
       }
      ],
      "pass": "No blocked cooling or enclosure overtemperature.",
      "freq": "Weekly",
      "owner": "EL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-048",
      "component": "Main motor DE bearing + NDE bearing",
      "check": [
       {
        "label": null,
        "text": "Trend bearing temperatures and DE vibration, listen by approved safe route."
       }
      ],
      "pass": "Stable under similar load; investigate step rises.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-049",
      "component": "Motor rotor and winding insulation",
      "check": [
       {
        "label": null,
        "text": "Review winding temp and test insulation / phase balance on isolated outage."
       }
      ],
      "pass": "OEM electrical condition; repair/rewind after failure assessment.",
      "freq": "Planned stop",
      "owner": "EL",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-050",
      "component": "Main motor MCC / VFD / cable terminations",
      "check": [
       {
        "label": null,
        "text": "Check load current, trips, ventilation filters and torque availability."
       }
      ],
      "pass": "No overheating/protection defeats; annual testing by qualified electrician.",
      "freq": "Planned stop",
      "owner": "EL",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-051",
      "component": "Motor flexible coupling / keys / guard",
      "check": [
       {
        "label": null,
        "text": "Inspect angular/parallel alignment, backlash and flexible elements at stop."
       }
      ],
      "pass": "No cracked insert or loose key; align to OEM spec.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-052",
      "component": "Gearbox casing / access cover / breather",
      "check": [
       {
        "label": null,
        "text": "Inspect oil weep, vents, joints, foundation and abnormal external heat."
       }
      ],
      "pass": "Sealed, clean, correctly ventilated and no foundation motion.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-053",
      "component": "Gearbox input shaft bearing",
      "check": [
       {
        "label": null,
        "text": "Review vibration and temperature at same running speed/load."
       }
      ],
      "pass": "Trending within learned baseline; investigate harmonics/new peaks.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-054",
      "component": "Gearbox output shaft bearing",
      "check": [
       {
        "label": null,
        "text": "Review vibration and temperature at same running speed/load."
       }
      ],
      "pass": "Trending within learned baseline; investigate harmonics/new peaks.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-055",
      "component": "Gearbox internal gear stages",
      "check": [
       {
        "label": null,
        "text": "At outage check pitting, scuffing, tooth load/contact and backlash to OEM."
       }
      ],
      "pass": "No spalling/severe tooth damage; metrology/repair required if abnormal.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-056",
      "component": "Gearbox bearings / shims / retention",
      "check": [
       {
        "label": null,
        "text": "Check endfloat, retaining bolts and seals during overhaul."
       }
      ],
      "pass": "OEM bearing fits and preload restored; record metrology.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-057",
      "component": "Gearbox drain / fill / sight plug",
      "check": [
       {
        "label": null,
        "text": "Check sealing, labels and magnetic drain condition at approved sampling."
       }
      ],
      "pass": "No leakage/particles inconsistent with baseline.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-058",
      "component": "Pinion shaft stationary bearings and housings",
      "check": [
       {
        "label": null,
        "text": "Trend vibration; check oil/grease seals, pedestal anchors and alignment."
       }
      ],
      "pass": "No rising mesh vibration or shaft movement.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-059",
      "component": "Pinion teeth / face wear / contact",
      "check": [
       {
        "label": null,
        "text": "At stop inspect backlash/contact pattern, chipped teeth and runout."
       }
      ],
      "pass": "OEM acceptable mesh; rectify alignment/wear after expert review.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-060",
      "component": "Girth gear rim / tooth flanks",
      "check": [
       {
        "label": null,
        "text": "Inspect spray film, abnormal pitting, root cracks and circumferential damage."
       }
      ],
      "pass": "Even film and contact; expert evaluation on bottoming or tooth failure.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-061",
      "component": "Girth gear bolted flange / key / shell lug",
      "check": [
       {
        "label": null,
        "text": "Inspect loose bolts, cracked brackets, welds and fretting."
       }
      ],
      "pass": "No movement or cracking; OEM torque and repair procedure.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-062",
      "component": "Girth gear split joints and guard",
      "check": [
       {
        "label": null,
        "text": "Inspect joint bolts, alignment, guarding and dust/oil accumulations."
       }
      ],
      "pass": "No missing bolts or exposed rotating teeth.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-114",
      "component": "Girth gear and pinion running thermography",
      "check": [
       {
        "label": null,
        "text": "Thermal image the girth-gear / pinion mesh across the face width while running; compare temperature profile with the previous survey."
       }
      ],
      "pass": "Even temperature across the face width; a hot edge or rising difference indicates misalignment or lubrication fault — investigate.",
      "freq": "Monthly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-115",
      "component": "Girth gear and pinion stroboscope inspection",
      "check": [
       {
        "label": null,
        "text": "With a stroboscope from the guarded inspection point, observe tooth contact, lubricant film and spray pattern while running."
       }
      ],
      "pass": "Full-face contact, even lubricant film and all spray nozzles delivering.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-117",
      "component": "Girth gear radial / axial runout measurement",
      "check": [
       {
        "label": null,
        "text": "Measure girth-gear radial and axial runout and pinion backlash with dial indicators at a planned stop."
       }
      ],
      "pass": "Runout and backlash within kiln OEM limits; re-shim or adjust per OEM if exceeded.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "7.7",
    "title": "Forced gearbox lubrication oil skid, valves and heat exchanger",
    "tasks": [
     {
      "id": "KLN-064",
      "component": "Gearbox lubricating-oil tank, sight glass and fittings",
      "check": [
       {
        "label": null,
        "text": "Inspect reservoir shell, sight glass, gasket, breather and drain/fill fittings for leaks; low-level switch functional test is separate."
       }
      ],
      "pass": "OEM level and clean reservoir; investigate loss.",
      "freq": "Daily",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-065",
      "component": "Oil pump duty motor / coupling",
      "check": [
       {
        "label": null,
        "text": "Review start/standby operating state, motor heat and noise; inspect coupling after isolation."
       }
      ],
      "pass": "Pump starts on command, no cavitation or damage.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-066",
      "component": "Standby lube pump / automatic selection",
      "check": [
       {
        "label": null,
        "text": "Verify availability / changeover in a controlled and approved functional test. Perform on the standby unit after a controlled changeover."
       }
      ],
      "pass": "Backup available; restore failed pump before critical service.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-067",
      "component": "Oil pump suction strainer",
      "check": [
       {
        "label": null,
        "text": "Compare suction condition and inspect screen on shutdown."
       }
      ],
      "pass": "Clean screen, no cavitation or suction restriction.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-069",
      "component": "Oil filter elements / housings",
      "check": [
       {
        "label": null,
        "text": "Trend filter differential pressure and inspect elements / seals during service."
       }
      ],
      "pass": "Below OEM changeout threshold; replace element and record delta.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-070",
      "component": "Filter bypass / isolation / bleed valves",
      "check": [
       {
        "label": null,
        "text": "Check valve line-up, seals and approved bypass arrangement at stop."
       }
      ],
      "pass": "No unintended bypass or leaks, correct isolation labeling.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-071",
      "component": "Oil cooler (air / water type TBC)",
      "check": [
       {
        "label": null,
        "text": "Trend supply/return temperature; inspect fins/tubes and fouling at outage."
       }
      ],
      "pass": "Temperature under OEM limits, no cross-contamination.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN + STOP",
      "scope": "BASE"
     },
     {
      "id": "KLN-072",
      "component": "Oil cooler water isolation / regulator valves",
      "check": [
       {
        "label": null,
        "text": "If water-cooled, inspect valve leakage, strainers, vent/drains and flow."
       }
      ],
      "pass": "Correct coolant flow, no oil-water mixing.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-075",
      "component": "Pressure relief / check valves / accumulators",
      "check": [
       {
        "label": null,
        "text": "Inspect certified setpoints and recharge/isolation where equipped."
       }
      ],
      "pass": "Protective devices in service; no stored pressure before work.",
      "freq": "Annually",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-076",
      "component": "Lube oil lines / bends / hose crimp / flanges",
      "check": [
       {
        "label": null,
        "text": "Inspect cracks, leaks, supports and hot-spot proximity."
       }
      ],
      "pass": "Leak-free and secured; replace damaged lines offline.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-077",
      "component": "Gearbox oil sampling tap and sample valve hardware",
      "check": [
       {
        "label": null,
        "text": "Inspect the external sampling port, cap, valve seat, tubing and flange integrity; laboratory sampling and oil analysis are separate manual work instructions."
       }
      ],
      "pass": "Sampling valve and cap sealed, safely identifiable and free of corrosion; laboratory interpretation is separate.",
      "freq": "Planned stop",
      "owner": "REL",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-078",
      "component": "Gearbox oil breather / desiccant (if fitted)",
      "check": [
       {
        "label": null,
        "text": "Inspect color/clogging and seal condition."
       }
      ],
      "pass": "Clean and functional; replace per OEM.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.8",
    "title": "Open girth-gear spray lubrication",
    "tasks": [
     {
      "id": "KLN-079",
      "component": "Spray lubricant drum / reservoir",
      "check": [
       {
        "label": null,
        "text": "Check lubricant grade, level, agitation if fitted and heater status."
       }
      ],
      "pass": "Correct OEM grade and sufficient supply; no contamination.",
      "freq": "Daily",
      "owner": "OP",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-080",
      "component": "Spray lubrication pump and motor",
      "check": [
       {
        "label": null,
        "text": "Check pump cycle, pressure trend, seal leaks, relief valve and overheating."
       }
      ],
      "pass": "Pump responds to controller; service failing unit.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-082",
      "component": "Spray metering block / progressive distributor",
      "check": [
       {
        "label": null,
        "text": "Inspect port labels, distributor condition and metering indicator pulses."
       }
      ],
      "pass": "No blocked or skipped metering output; OEM method required.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-083",
      "component": "Spray branches 1-6: pipe and fittings",
      "check": [
       {
        "label": null,
        "text": "Trace each flexible/hard branch; inspect chafe, valve seats, leaks and clamping."
       }
      ],
      "pass": "No branch blockage/leak; branch mapping verified to installed OEM.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-084",
      "component": "Spray nozzles / manifolds / nozzle mounts",
      "check": [
       {
        "label": null,
        "text": "Inspect alignment, air-assist if fitted and nozzle discharge visually at permitted stop."
       }
      ],
      "pass": "Even gear-face delivery; metering pulse alone is NOT proof of spray.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-085",
      "component": "Spray air header / regulator / filter",
      "check": [
       {
        "label": null,
        "text": "If air-assisted, verify clean/dry air, solenoid, nonreturn and pressure."
       }
      ],
      "pass": "Approved pressure and unobstructed atomizing path.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-086",
      "component": "Open gear guards / drain / splash tray",
      "check": [
       {
        "label": null,
        "text": "Examine access doors, oily debris, guard corrosion and guards in place."
       }
      ],
      "pass": "No unsafe access / lubricant spillage; repair offline.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-087",
      "component": "Spray line isolation / drain valves",
      "check": [
       {
        "label": null,
        "text": "Verify tagged shutoff and no accidental closed branch in controlled outage."
       }
      ],
      "pass": "Correct normal valve lineup and no leakage.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.9",
    "title": "Auxiliary drive and axial hydraulic thrust",
    "tasks": [
     {
      "id": "KLN-088",
      "component": "Auxiliary motor, cooling and gearbox",
      "check": [
       {
        "label": null,
        "text": "Inspect availability, oil leaks, starter and evidence of wear."
       }
      ],
      "pass": "Auxiliary turning system ready for main-drive trip.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-089",
      "component": "Auxiliary drive clutch / overrunning device",
      "check": [
       {
        "label": null,
        "text": "Test engagement/disengagement with OEM sequence under approved shutdown."
       }
      ],
      "pass": "No unintended simultaneous engagement or slip.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-090",
      "component": "Auxiliary brake lining, armature and release mechanism",
      "check": [
       {
        "label": null,
        "text": "Inspect brake friction surface, mechanical clearance, springs and fasteners under isolation; brake-wear switch proof test is in sensor checklist."
       }
      ],
      "pass": "Brake lining thickness and mechanical clearance meet OEM criteria; no fluid/grease contamination.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-091",
      "component": "Auxiliary brake linkages / springs / air actuation",
      "check": [
       {
        "label": null,
        "text": "Inspect pins, cotters, clearances and brake release feedback."
       }
      ],
      "pass": "Proper hold/release under approved procedure.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-092",
      "component": "Thrust roller face / bearings / housing",
      "check": [
       {
        "label": null,
        "text": "Inspect tyre contact, scoring, seals and temperature."
       }
      ],
      "pass": "Correct OEM face contact and no bearing damage.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-093",
      "component": "Thrust hydraulic unit tank / filter / oil",
      "check": [
       {
        "label": null,
        "text": "Trend pressure, check tank, breather, oil quality and filter indicator."
       }
      ],
      "pass": "Correct oil/pressure; no foaming/water.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-094",
      "component": "Thrust pump / motor / suction",
      "check": [
       {
        "label": null,
        "text": "Inspect mounting, suction line, seal leaks, coupling and noise."
       }
      ],
      "pass": "No cavitation or oil leakage.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-095",
      "component": "Thrust directional / proportional valve",
      "check": [
       {
        "label": null,
        "text": "Check response to authorized position control and spool sticking."
       }
      ],
      "pass": "Valve follows accepted strategy; service under isolation.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-096",
      "component": "Thrust relief / check / pilot valves",
      "check": [
       {
        "label": null,
        "text": "Verify certified relief settings and check-valve integrity in OEM test."
       }
      ],
      "pass": "No uncontrolled thrust pressure or drift.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-097",
      "component": "Thrust cylinder / ram / rod seals",
      "check": [
       {
        "label": null,
        "text": "Inspect rod surface, clevis/pins, oil leaks and stroke stops."
       }
      ],
      "pass": "No leaking seals or bent rod.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-100",
      "component": "Hydraulic hose / tube / flange / manifold",
      "check": [
       {
        "label": null,
        "text": "Inspect from safe distance for leak, fatigue and missing clamps."
       }
      ],
      "pass": "No spraying oil or damaged hose; zero-pressure isolation before repair.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "7.10",
    "title": "Kiln outlet hood, sector plates, cooling shroud and burner interface",
    "tasks": [
     {
      "id": "KLN-101",
      "component": "Outlet stationary hood structure / expansion",
      "check": [
       {
        "label": null,
        "text": "Inspect hot gas leak, shell crack, flange and differential movement."
       }
      ],
      "pass": "No leaking hot process gas or distorted hood.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-102",
      "component": "Outlet seal / labyrinth / flexible blades",
      "check": [
       {
        "label": null,
        "text": "Inspect leakage, preload hardware and clearance where fitted."
       }
      ],
      "pass": "No excessive false air or rubbing on rotating shell.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-103",
      "component": "Outlet sector plates / retaining bolts",
      "check": [
       {
        "label": null,
        "text": "During cool outage inspect castable lining, broken plates, attachments and end ring."
       }
      ],
      "pass": "No broken segment or exposed shell, correct retention.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "KLN-104",
      "component": "Cooling shroud (cow shell) metal / insulation",
      "check": [
       {
        "label": null,
        "text": "Inspect surface temperature, cracks and local overheating."
       }
      ],
      "pass": "Stable measured surface temp and intact cladding.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-105",
      "component": "Sector-plate cooling-air supply / branches",
      "check": [
       {
        "label": null,
        "text": "Inspect supply temperature, ducts, valves, elbows and support straps."
       }
      ],
      "pass": "Air path unobstructed and cooling available.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-106",
      "component": "Outlet cooling fan motor / rotor / guards",
      "check": [
       {
        "label": null,
        "text": "Verify actual presence, airflow and bearing condition before task registration."
       }
      ],
      "pass": "Fan and motor run normally if fitted; no assumed sensors.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-110",
      "component": "Burner lance support / hood seals",
      "check": [
       {
        "label": null,
        "text": "Check hot-end gap, flexible support and dust/air leakage at hood penetrations."
       }
      ],
      "pass": "No rubbing/misalignment; restore offline.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "KLN-111",
      "component": "Outlet fasteners / expansion joints / flanges",
      "check": [
       {
        "label": null,
        "text": "Look for hot marks, cracked connections and missing bolts."
       }
      ],
      "pass": "No hot gas leaks; engineering repair after cool shutdown.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "7.11",
    "title": "Additional minor kiln auxiliaries and fixed hardware",
    "tasks": [
     {
      "id": "KLN-112",
      "component": "Kiln drive coupling oil guard / inspection drain",
      "check": [
       {
        "label": null,
        "text": "If enclosed wet-coupling or spindle oil system is fitted, inspect drain plug, seals, breather and containment."
       }
      ],
      "pass": "OEM lubricant retained; no spray to hot surfaces; service isolated.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "KLN-113",
      "component": "Outlet cooling shroud fan suction screens / flex duct",
      "check": [
       {
        "label": null,
        "text": "Check fan intake obstruction, duct joints, guards, heat damage and supports where fan installed."
       }
      ],
      "pass": "Open air path, no broken screen or loss of cooling; restore before hot duty.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 },
 {
  "code": "BRN-01",
  "title": "Main burner and fine-coal system",
  "groups": [
   {
    "num": "8.1",
    "title": "Burner lance and combustion-air hardware",
    "tasks": [
     {
      "id": "BRN-001",
      "component": "Main burner lance tube and support bearings",
      "check": [
       {
        "label": null,
        "text": "Examine external alignment, heat shields, suspension and support bolts."
       }
      ],
      "pass": "Lance stable and correctly centered; adjust only under approved stop.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "BRN-002",
      "component": "Burner hot tip / nozzles / diffuser",
      "check": [
       {
        "label": null,
        "text": "Inspect channel apertures, erosion, deposits and distortion at shutdown."
       }
      ],
      "pass": "Clean OEM geometry; replace damaged burner tip.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "BRN-003",
      "component": "Burner swirl/helical air channel and duct seals",
      "check": [
       {
        "label": null,
        "text": "Inspect branch channel wall, dampers, seals, mechanical leakage paths and flange fasteners at authorized stop; transmitter proof checks are separate."
       }
      ],
      "pass": "No burned/deformed channel, cracked duct seal, sticking damper or leaking flange; OEM geometry retained.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "BRN-004",
      "component": "Burner jet/axial air channel and duct seals",
      "check": [
       {
        "label": null,
        "text": "Inspect branch walls, internal diffuser/nozzle and seals at authorized stop; pressure measurement checks are separate."
       }
      ],
      "pass": "Jet-air path clean, mechanically aligned and leak-tight under OEM conditions; no damaged nozzle.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "BRN-005",
      "component": "Primary-air header pipework and dampers",
      "check": [
       {
        "label": null,
        "text": "Inspect header joints, supports, flange gaskets, drains and dampers for leakage/erosion; pressure transmitter test is separate."
       }
      ],
      "pass": "Primary-air header, branch flanges and mechanical dampers leak-tight and securely supported.",
      "freq": "Daily",
      "owner": "OP",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "BRN-006",
      "component": "Primary air line butterfly / control dampers",
      "check": [
       {
        "label": null,
        "text": "Inspect shaft seals, blade condition, actuator position and linkage."
       }
      ],
      "pass": "Travel free and retains setpoint; refurbish after shutdown.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "BRN-007",
      "component": "Primary air fan impeller / housing",
      "check": [
       {
        "label": null,
        "text": "Trend vibration, inspect inlet/filter, corrosion and buildup."
       }
      ],
      "pass": "No imbalance/erosion defects.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "BRN-008",
      "component": "Primary air fan bearings / shaft seals",
      "check": [
       {
        "label": null,
        "text": "Trend temperature, oil/grease state and housing integrity."
       }
      ],
      "pass": "Within OEM band and no loss of lubricant.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "BRN-009",
      "component": "Primary air fan motor / starter / VFD",
      "check": [
       {
        "label": null,
        "text": "Compare current and air pressure, inspect motor cooling."
       }
      ],
      "pass": "Load consistent with air demand; protection healthy.",
      "freq": "Weekly",
      "owner": "EL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "BRN-010",
      "component": "Primary air fan coupling / guards / foundation",
      "check": [
       {
        "label": null,
        "text": "Check coupling alignment, mounts and fasteners on isolated machine."
       }
      ],
      "pass": "No worn element/loose anchors.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "BRN-011",
      "component": "Burner channel expansion hose / clamps",
      "check": [
       {
        "label": null,
        "text": "Inspect high-temperature flexible coupling, sheath and leaks."
       }
      ],
      "pass": "No fraying or air loss; replace with OEM part.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "8.2",
    "title": "Fine-coal bin, weighfeeder and conveying blower",
    "tasks": [
     {
      "id": "BRN-015",
      "component": "Fine-coal bin shell / roof / cone / inspection hatch",
      "check": [
       {
        "label": null,
        "text": "Check dust trails, deformation, roof closure and overheating indicators."
       }
      ],
      "pass": "No leak, hot surface or gas hazard; do not open with combustible atmosphere.",
      "freq": "Daily",
      "owner": "OP",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "BRN-019",
      "component": "Coal-bin vent / filter / isolation protections",
      "check": [
       {
        "label": null,
        "text": "Verify approved design and prevent combustible-dust escape / air ingress."
       }
      ],
      "pass": "Site combustible-dust control scheme intact; no improvised opening.",
      "freq": "Planned stop",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "BRN-020",
      "component": "Coal bin aeration / anti-bridging tools",
      "check": [
       {
        "label": null,
        "text": "If installed, inspect attachments, seals and operating permit."
       }
      ],
      "pass": "No unintended air ingress into coal inventory; safe use per OEM/EHS.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "BRN-021",
      "component": "Kiln coal feeder: dosing rotor / belt, rollers, bearings, seals and drive",
      "check": [
       {
        "label": null,
        "text": "At isolated coal feeder inspect rotor or belt / rollers, seals, bearings, shaft alignment, drive coupling and wear surfaces. Weighing calibration belongs to the sensor checklist."
       }
      ],
      "pass": "Feeder rotor, dosing blade, seal, bearings and housing mechanically sound; no coal leakage or buildup.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN + STOP",
      "scope": "BASE"
     },
     {
      "id": "BRN-023",
      "component": "Coal feeder gate / isolation and airlock",
      "check": [
       {
        "label": null,
        "text": "Inspect seals, wear and correct valve sequencing per approved fire safety plan."
       }
      ],
      "pass": "Dust-tight and correctly actuated; no control bypass.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "BRN-025",
      "component": "Coal transport pipes / elbows / flanges",
      "check": [
       {
        "label": null,
        "text": "Inspect abrasive wear, leakage and wall-thickness evidence at bends."
       }
      ],
      "pass": "No coal leak/hot spot; replace worn elbow on isolation.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "BRN-026",
      "component": "Coal transport piping supports / expansion pieces",
      "check": [
       {
        "label": null,
        "text": "Inspect restraint, thermal movement, clamps and earthing."
       }
      ],
      "pass": "No fatigue/corrosion or chafing.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "BRN-027",
      "component": "Coal blower impeller / rotor / casing",
      "check": [
       {
        "label": null,
        "text": "Trend vibration, inspect casing for erosion, leakage and foundation."
       }
      ],
      "pass": "No imbalance / leakage; clean under safe isolation.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "BRN-028",
      "component": "Coal blower motor / terminal box / MCC",
      "check": [
       {
        "label": null,
        "text": "Monitor motor load, cooling air and trip history."
       }
      ],
      "pass": "Electrical load aligns with pneumatic conveying.",
      "freq": "Weekly",
      "owner": "EL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "BRN-029",
      "component": "Coal blower bearings / shaft seals",
      "check": [
       {
        "label": null,
        "text": "Inspect thermal trend and seals by approved external route."
       }
      ],
      "pass": "No lubricant loss or emerging defect.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "BRN-030",
      "component": "Coal blower check / relief / vent / isolation valves",
      "check": [
       {
        "label": null,
        "text": "Where fitted, review position, spring relief certification and reverse-flow protection."
       }
      ],
      "pass": "All safety valves approved and tested under shutdown.",
      "freq": "Annually",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "BRN-031",
      "component": "Coal piping flexible connectors / expansion joints",
      "check": [
       {
        "label": null,
        "text": "Inspect for abrasive thinning, air leaks and static-bonding straps."
       }
      ],
      "pass": "No breach, correct conductive hose and bond.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "BRN-032",
      "component": "Coal system grounding / bonding / area equipment",
      "check": [
       {
        "label": null,
        "text": "EHS verifies approved equipment classification, earth continuity and housekeeping."
       }
      ],
      "pass": "Combustible-dust controls intact; respond to spark/heat hazards.",
      "freq": "Planned stop",
      "owner": "EH",
      "mode": "OFF",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "8.3",
    "title": "Burner coal-line and purge accessory integrity",
    "tasks": [
     {
      "id": "BRN-033",
      "component": "Coal line pressure relief / purge spool / drain fittings",
      "check": [
       {
        "label": null,
        "text": "Identify installed arrangement; verify tight isolation and no dust-plugging or coal buildup at authorized stop."
       }
      ],
      "pass": "Fuel/air flow intact and no unapproved vent; plant fire safety approved.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "BRN-034",
      "component": "Burner lance sliding support / expansion seal / flange bolts",
      "check": [
       {
        "label": null,
        "text": "Inspect thermal-growth clearances, supports, gasket, flange and retention hardware."
       }
      ],
      "pass": "Lance supported without distortion or flame path leakage.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "BRN-035",
      "component": "Hazardous-area (Ex) equipment in the coal system",
      "check": [
       {
        "label": null,
        "text": "Detailed / close Ex inspection of coal-area electrical and instrument equipment (instruments, junction boxes, motors, DAQ node) per IEC 60079-17 and the area classification."
       }
      ],
      "pass": "Ex marking matches zone; enclosures, glands and earthing intact; defects corrected before return to service.",
      "freq": "Annually",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 },
 {
  "code": "CLR-01",
  "title": "Clinker cooler, fans and grate drive",
  "groups": [
   {
    "num": "9.1",
    "title": "Clinker cooler casing, grate bed and fixed/moving assembly",
    "tasks": [
     {
      "id": "CLR-001",
      "component": "Cooler hot inlet hood / fixed inlet castable",
      "check": [
       {
        "label": null,
        "text": "Inspect casing hot marks, expansion supports and clinker buildup."
       }
      ],
      "pass": "No cracked lining / abnormal seal leakage.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CLR-002",
      "component": "Cooler grate plates / air slots / wear segments",
      "check": [
       {
        "label": null,
        "text": "Inspect wear, blocked slots and cracks after shutdown and cooling."
       }
      ],
      "pass": "No open holes or loose plate; restore design air distribution.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "CLR-003",
      "component": "Clinker bed profile / grate operating condition",
      "check": [
       {
        "label": null,
        "text": "Review temperature/compartment pressures and bed movement."
       }
      ],
      "pass": "Stable bed; investigate red rivers/snowmen, not pressure alone.",
      "freq": "Each shift",
      "owner": "OP",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CLR-004",
      "component": "Grate crossbars / moving frames (OEM type)",
      "check": [
       {
        "label": null,
        "text": "If fitted inspect mounting bolts, wear strips, side seals and travel."
       }
      ],
      "pass": "Correct mechanism per cooler OEM; do not assume every grate has crossbars.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-005",
      "component": "Grate guides / rollers / wear shoes",
      "check": [
       {
        "label": null,
        "text": "Check wear, uneven rubbing, structural supports and lubrication at stop."
       }
      ],
      "pass": "No seizure, correct gap and alignment.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-006",
      "component": "Clinker spill-through pockets / under-grate hoppers",
      "check": [
       {
        "label": null,
        "text": "Inspect signs of abnormal fall-through; empty after cooled shutdown."
       }
      ],
      "pass": "No excessive deposits or restriction of cooling air.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CLR-007",
      "component": "Cooler air sealing plates / side seal strips",
      "check": [
       {
        "label": null,
        "text": "Inspect seal wear, heat erosion and loose retainers at stop."
       }
      ],
      "pass": "No open bypass paths; fit OEM strips/seals.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "CLR-008",
      "component": "Cooling air plenum dividers / dampers",
      "check": [
       {
        "label": null,
        "text": "Inspect cracks, wall leakage and travel/sticking where dampers installed."
       }
      ],
      "pass": "Compartments separate as designed, dampers move freely.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-009",
      "component": "Cooler shell / roof insulation / observation ports",
      "check": [
       {
        "label": null,
        "text": "Check external dust leaks, hot spots, doors and gaskets."
       }
      ],
      "pass": "Closed and leak free; correct damaged lining.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CLR-010",
      "component": "Cooler discharge chute / transition to crusher",
      "check": [
       {
        "label": null,
        "text": "Check hot clinker spill, liners and obstruction indicators."
       }
      ],
      "pass": "No leakage or block; clean only when cooled/isolated.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CLR-012",
      "component": "Cooler cooler-to-hood secondary-air entry",
      "check": [
       {
        "label": null,
        "text": "Inspect seal, ducts, expansion and local hot-gas leakage."
       }
      ],
      "pass": "No obvious leakage; hot air path intact.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CLR-068",
      "component": "Cooler inlet air blasters (if fitted)",
      "check": [
       {
        "label": null,
        "text": "Check firing sequence, receiver, solenoid / quick-exhaust valve leaks and nozzle condition from outside; isolate an individual blaster for repair."
       }
      ],
      "pass": "All installed blasters fire in sequence; no air leaks; individual isolation proven.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-069",
      "component": "Cooler inlet build-up (snowman) and red river",
      "check": [
       {
        "label": null,
        "text": "Observe the cooler inlet through camera / sight ports for snowman build-up and red river; report to CCR."
       }
      ],
      "pass": "No growing build-up blocking the inlet or distorting air distribution; escalate to process engineer.",
      "freq": "Each shift",
      "owner": "OP",
      "mode": "RUN",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "9.2",
    "title": "Cooling-air chamber 1 and cooling fan 1",
    "tasks": [
     {
      "id": "CLR-015",
      "component": "Fan 1 casing, impeller and inlet filter",
      "check": [
       {
        "label": null,
        "text": "Inspect for dust, abrasion, noise, air leaks and inlet blockage."
       }
      ],
      "pass": "No foreign object or abnormal noise; clean/inspect isolated.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-016",
      "component": "Fan 1 bearings, bearing seals and shaft",
      "check": [
       {
        "label": null,
        "text": "Trend bearing heat; monitor vibration only where tag assigned (fans 1-3)."
       }
      ],
      "pass": "No rising abnormal mechanical condition; grease per OEM.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-017",
      "component": "Fan 1 coupling / V-belt / guards if installed",
      "check": [
       {
        "label": null,
        "text": "Inspect fasteners, alignment, belt wear/tension and guards."
       }
      ],
      "pass": "No loose guard or coupling; adjust during isolation.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-018",
      "component": "Fan 1 discharge duct, flange and damper",
      "check": [
       {
        "label": null,
        "text": "Look for external air leak, flange loosening and damper setting response."
       }
      ],
      "pass": "Correct flow route and sealed joints; repair at stop.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "9.3",
    "title": "Cooling-air chamber 2 and cooling fan 2",
    "tasks": [
     {
      "id": "CLR-021",
      "component": "Fan 2 casing, impeller and inlet filter",
      "check": [
       {
        "label": null,
        "text": "Inspect for dust, abrasion, noise, air leaks and inlet blockage."
       }
      ],
      "pass": "No foreign object or abnormal noise; clean/inspect isolated.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-022",
      "component": "Fan 2 bearings, bearing seals and shaft",
      "check": [
       {
        "label": null,
        "text": "Trend bearing heat; monitor vibration only where tag assigned (fans 1-3)."
       }
      ],
      "pass": "No rising abnormal mechanical condition; grease per OEM.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-023",
      "component": "Fan 2 coupling / V-belt / guards if installed",
      "check": [
       {
        "label": null,
        "text": "Inspect fasteners, alignment, belt wear/tension and guards."
       }
      ],
      "pass": "No loose guard or coupling; adjust during isolation.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-024",
      "component": "Fan 2 discharge duct, flange and damper",
      "check": [
       {
        "label": null,
        "text": "Look for external air leak, flange loosening and damper setting response."
       }
      ],
      "pass": "Correct flow route and sealed joints; repair at stop.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "9.4",
    "title": "Cooling-air chamber 3 and cooling fan 3",
    "tasks": [
     {
      "id": "CLR-027",
      "component": "Fan 3 casing, impeller and inlet filter",
      "check": [
       {
        "label": null,
        "text": "Inspect for dust, abrasion, noise, air leaks and inlet blockage."
       }
      ],
      "pass": "No foreign object or abnormal noise; clean/inspect isolated.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-028",
      "component": "Fan 3 bearings, bearing seals and shaft",
      "check": [
       {
        "label": null,
        "text": "Trend bearing heat; monitor vibration only where tag assigned (fans 1-3)."
       }
      ],
      "pass": "No rising abnormal mechanical condition; grease per OEM.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-029",
      "component": "Fan 3 coupling / V-belt / guards if installed",
      "check": [
       {
        "label": null,
        "text": "Inspect fasteners, alignment, belt wear/tension and guards."
       }
      ],
      "pass": "No loose guard or coupling; adjust during isolation.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-030",
      "component": "Fan 3 discharge duct, flange and damper",
      "check": [
       {
        "label": null,
        "text": "Look for external air leak, flange loosening and damper setting response."
       }
      ],
      "pass": "Correct flow route and sealed joints; repair at stop.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "9.5",
    "title": "Cooling-air chamber 4 and cooling fan 4",
    "tasks": [
     {
      "id": "CLR-033",
      "component": "Fan 4 casing, impeller and inlet filter",
      "check": [
       {
        "label": null,
        "text": "Inspect for dust, abrasion, noise, air leaks and inlet blockage."
       }
      ],
      "pass": "No foreign object or abnormal noise; clean/inspect isolated.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-034",
      "component": "Fan 4 bearings, bearing seals and shaft",
      "check": [
       {
        "label": null,
        "text": "Trend bearing heat; monitor vibration only where tag assigned (fans 1-3)."
       }
      ],
      "pass": "No rising abnormal mechanical condition; grease per OEM.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-035",
      "component": "Fan 4 coupling / V-belt / guards if installed",
      "check": [
       {
        "label": null,
        "text": "Inspect fasteners, alignment, belt wear/tension and guards."
       }
      ],
      "pass": "No loose guard or coupling; adjust during isolation.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-036",
      "component": "Fan 4 discharge duct, flange and damper",
      "check": [
       {
        "label": null,
        "text": "Look for external air leak, flange loosening and damper setting response."
       }
      ],
      "pass": "Correct flow route and sealed joints; repair at stop.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "9.6",
    "title": "Cooling-air chamber 5 and cooling fan 5",
    "tasks": [
     {
      "id": "CLR-039",
      "component": "Fan 5 casing, impeller and inlet filter",
      "check": [
       {
        "label": null,
        "text": "Inspect for dust, abrasion, noise, air leaks and inlet blockage."
       }
      ],
      "pass": "No foreign object or abnormal noise; clean/inspect isolated.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-040",
      "component": "Fan 5 bearings, bearing seals and shaft",
      "check": [
       {
        "label": null,
        "text": "Trend bearing heat; monitor vibration only where tag assigned (fans 1-3)."
       }
      ],
      "pass": "No rising abnormal mechanical condition; grease per OEM.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-041",
      "component": "Fan 5 coupling / V-belt / guards if installed",
      "check": [
       {
        "label": null,
        "text": "Inspect fasteners, alignment, belt wear/tension and guards."
       }
      ],
      "pass": "No loose guard or coupling; adjust during isolation.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-042",
      "component": "Fan 5 discharge duct, flange and damper",
      "check": [
       {
        "label": null,
        "text": "Look for external air leak, flange loosening and damper setting response."
       }
      ],
      "pass": "Correct flow route and sealed joints; repair at stop.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "9.7",
    "title": "Cooling-air chamber 6 and cooling fan 6",
    "tasks": [
     {
      "id": "CLR-045",
      "component": "Fan 6 casing, impeller and inlet filter",
      "check": [
       {
        "label": null,
        "text": "Inspect for dust, abrasion, noise, air leaks and inlet blockage."
       }
      ],
      "pass": "No foreign object or abnormal noise; clean/inspect isolated.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-046",
      "component": "Fan 6 bearings, bearing seals and shaft",
      "check": [
       {
        "label": null,
        "text": "Trend bearing heat; monitor vibration only where tag assigned (fans 1-3)."
       }
      ],
      "pass": "No rising abnormal mechanical condition; grease per OEM.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-047",
      "component": "Fan 6 coupling / V-belt / guards if installed",
      "check": [
       {
        "label": null,
        "text": "Inspect fasteners, alignment, belt wear/tension and guards."
       }
      ],
      "pass": "No loose guard or coupling; adjust during isolation.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-048",
      "component": "Fan 6 discharge duct, flange and damper",
      "check": [
       {
        "label": null,
        "text": "Look for external air leak, flange loosening and damper setting response."
       }
      ],
      "pass": "Correct flow route and sealed joints; repair at stop.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "9.8",
    "title": "Grate drive hydraulic unit, lines, controls and cooler vent",
    "tasks": [
     {
      "id": "CLR-049",
      "component": "Grate hydraulic reservoir / oil sight / breather",
      "check": [
       {
        "label": null,
        "text": "Check level, cleanliness, temperature trend, external leaks and breather."
       }
      ],
      "pass": "Right grade/level, no foaming, no rapid temperature rise.",
      "freq": "Daily",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CLR-050",
      "component": "Grate hydraulic pump / motor / suction",
      "check": [
       {
        "label": null,
        "text": "Check pump output response, cavitation noise, suction strainer and shaft seal."
       }
      ],
      "pass": "Adequate working pressure/flow, no cavitation.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CLR-051",
      "component": "Grate hydraulic return filter, housing and bypass",
      "check": [
       {
        "label": null,
        "text": "Inspect oil-filter element, seals, bowls, check/bypass valves and leakage after hydraulic pressure is isolated; DP indicator calibration is separate."
       }
      ],
      "pass": "Correct rated filter element, housing and bypass seated; no leakage under authorized return-to-service check.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CLR-052",
      "component": "Hydraulic directional / proportional valves",
      "check": [
       {
        "label": null,
        "text": "Test grate directional response, coil wiring and spool drift at controlled stop."
       }
      ],
      "pass": "Correct safe stroking and no sticking.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "CLR-053",
      "component": "Hydraulic relief / check valves / accumulators",
      "check": [
       {
        "label": null,
        "text": "Verify setpoint/certifications and depressurize per OEM before servicing."
       }
      ],
      "pass": "No overpressure; accumulator stored energy fully controlled.",
      "freq": "Annually",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-054",
      "component": "Hydraulic cylinders / rod / clevis / pins",
      "check": [
       {
        "label": null,
        "text": "Inspect gland leakage, rod pitting, retaining bolts and pivots."
       }
      ],
      "pass": "No scored rod or uncontrolled leakage.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CLR-055",
      "component": "Hydraulic hoses / hard lines / flanges / connectors",
      "check": [
       {
        "label": null,
        "text": "Inspect for abrasion, heat/contact and leak using safe noncontact route."
       }
      ],
      "pass": "No wetness/burst risk, clamps secure; never tighten energized hose.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CLR-057",
      "component": "Cooler vent gas duct / expansion joints",
      "check": [
       {
        "label": null,
        "text": "Check hot dust leakage, supports, seals and erosion at bends."
       }
      ],
      "pass": "No leak / collapse; overhaul at stop.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CLR-058",
      "component": "Cooler vent fan wheel / shaft / casing",
      "check": [
       {
        "label": null,
        "text": "Trend vibration and inspect deposits/abrasion at outage."
       }
      ],
      "pass": "No new imbalance or impeller damage.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN + STOP",
      "scope": "BASE"
     },
     {
      "id": "CLR-059",
      "component": "Cooler vent fan bearings / seals",
      "check": [
       {
        "label": null,
        "text": "Monitor temperature, lubricant and housing bolts."
       }
      ],
      "pass": "No rapid heating or leakage.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CLR-060",
      "component": "Cooler vent motor MCC / VFD / coupling",
      "check": [
       {
        "label": null,
        "text": "Inspect loading, drive fault history and coupling alignment."
       }
      ],
      "pass": "Loading consistent with airflow, protection functional.",
      "freq": "Planned stop",
      "owner": "EL",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "CLR-062",
      "component": "Cooler vent dust-collector/air fan interface",
      "check": [
       {
        "label": null,
        "text": "Where fitted, inspect dust extraction arrangement, filter, hopper and fan order on as-built."
       }
      ],
      "pass": "Interface ownership assigned; no invented D5 online collector tags.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-063",
      "component": "Grate hydraulic tank and mechanical drain fittings",
      "check": [
       {
        "label": null,
        "text": "Inspect drain, vent, isolation, piping and flange hardware after isolation; hydraulic pressure instruments are maintained separately."
       }
      ],
      "pass": "Tank/drain fittings and pipe joints leak-tight with labelled correct isolation positions.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "9.9",
    "title": "Cooler vent dedusting and hot-gas accessories",
    "tasks": [
     {
      "id": "CLR-064",
      "component": "Cooler vent filter/ESP equipment population",
      "check": [
       {
        "label": null,
        "text": "Identify actual vent-gas treatment equipment (filter/ESP/other) and fan order from P&ID."
       }
      ],
      "pass": "Every installed dust-control item assigned its own CMMS route; never infer installation.",
      "freq": "Annually",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-065",
      "component": "Cooler vent hopper rotary feeder / screw conveyor if fitted",
      "check": [
       {
        "label": null,
        "text": "Verify extraction, motor drive, seals, bearing grease and material buildup."
       }
      ],
      "pass": "Ash discharge works without blocking fan or filter; apply isolated dust-safe work.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-066",
      "component": "Cooler vent damper, expansion bellows and flanged joints",
      "check": [
       {
        "label": null,
        "text": "Inspect linkage travel, actuator, thermal movement, leak tracks and bolts."
       }
      ],
      "pass": "Controlled excess-air route, no gas leakage or bearing overheating.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CLR-067",
      "component": "Cooler vent filter bags/pulse valves if fitted",
      "check": [
       {
        "label": null,
        "text": "Record filter media, pulse system, compressor and hopper equipment; carry out dedicated filter inspection schedule."
       }
      ],
      "pass": "No dust breakthrough or stuck pulse valve; OEM- approved replacement.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 },
 {
  "code": "HMR-01",
  "title": "Clinker hammer crusher",
  "groups": [
   {
    "num": "10.1",
    "title": "Hammer crusher housing, hammers, rotor, motor and protections",
    "tasks": [
     {
      "id": "HMR-001",
      "component": "Crusher inlet chute / adjustable throat",
      "check": [
       {
        "label": null,
        "text": "Inspect hot clinker buildup, liner wear and flange sealing."
       }
      ],
      "pass": "Clear safe passage and no spill to walkway.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "HMR-002",
      "component": "Crusher feed chute guard / access interlock",
      "check": [
       {
        "label": null,
        "text": "Check door seals, interlocked covers and latch status."
       }
      ],
      "pass": "Covers secure; open only with machine isolated.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "HMR-003",
      "component": "Crusher casing / welds / wear liners",
      "check": [
       {
        "label": null,
        "text": "Inspect external cracking, abrasion/dust leaks and housing fasteners."
       }
      ],
      "pass": "No hole or loose plate; replace worn liners at stop.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "HMR-004",
      "component": "Hammer rotor disc / shaft / keyways",
      "check": [
       {
        "label": null,
        "text": "Inspect rotor cracks, shaft runout and keyed connections after shutdown."
       }
      ],
      "pass": "No fracture or distortion; qualified NDT/repair.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "HMR-005",
      "component": "Hammers / hammer pins / sleeves / retainers",
      "check": [
       {
        "label": null,
        "text": "Inspect wear pattern, mass balance, cracked pins and retainers at stop."
       }
      ],
      "pass": "Hammers within approved wear and balance limits; replace matched set.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "HMR-006",
      "component": "Crusher breaker plates / grates (if fitted)",
      "check": [
       {
        "label": null,
        "text": "Check clearance, segment wear and fasteners."
       }
      ],
      "pass": "Uniform OEM gap with no broken plate.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "HMR-007",
      "component": "Crusher rotor DE bearing",
      "check": [
       {
        "label": null,
        "text": "Trend vibration/temperature and housing leakage."
       }
      ],
      "pass": "Stable load-matched baseline; grease/repair as needed.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "HMR-008",
      "component": "Crusher rotor NDE bearing",
      "check": [
       {
        "label": null,
        "text": "Trend vibration/temperature and housing leakage."
       }
      ],
      "pass": "Stable load-matched baseline; grease/repair as needed.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "HMR-009",
      "component": "Crusher shaft sealing / labyrinths",
      "check": [
       {
        "label": null,
        "text": "Check hot dust ingress, grease leakage and external dust trails."
       }
      ],
      "pass": "Seals intact; restore OEM arrangement.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "HMR-010",
      "component": "Crusher couplings / belts / pulleys (drive type TBC)",
      "check": [
       {
        "label": null,
        "text": "Inspect misalignment, cracked element and guard at shutdown."
       }
      ],
      "pass": "Correct alignment / belt tension per OEM.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "HMR-011",
      "component": "Crusher motor electrical load / starter",
      "check": [
       {
        "label": null,
        "text": "Check current and trip events against clinker load."
       }
      ],
      "pass": "No unexplained overload or unapproved trip bypass.",
      "freq": "Daily",
      "owner": "EL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "HMR-014",
      "component": "Crusher foundation / anchors / vibration isolators",
      "check": [
       {
        "label": null,
        "text": "Inspect anchor witness marks, grout cracks, excess movement."
       }
      ],
      "pass": "No loosening or structural fracture.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "HMR-015",
      "component": "Crusher rotor inspection doors / bolts",
      "check": [
       {
        "label": null,
        "text": "Check closure, tamper proofing and gaskets."
       }
      ],
      "pass": "Secure and leak-tight.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "HMR-016",
      "component": "Crusher discharge chute / skirt / flange",
      "check": [
       {
        "label": null,
        "text": "Inspect accumulation, liner wear, dust leaks and obstruction."
       }
      ],
      "pass": "Clear material path to pan conveyor.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "HMR-017",
      "component": "Crusher metal trap/magnet/detector where fitted",
      "check": [
       {
        "label": null,
        "text": "Confirm installed devices and inspect discharge/controls under permitted stop."
       }
      ],
      "pass": "Foreign metal not entering rotor; OEM-approved devices working.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "HMR-018",
      "component": "Crusher lubrication points / greasers",
      "check": [
       {
        "label": null,
        "text": "Check grease identity, volume, fitting cleanliness and line damage."
       }
      ],
      "pass": "Lubricated per bearing OEM, no overgreasing.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     }
    ]
   }
  ]
 },
 {
  "code": "CSL-01",
  "title": "Clinker transport and silo",
  "groups": [
   {
    "num": "11.1",
    "title": "Deep-pan conveyor, drive, chains and structure",
    "tasks": [
     {
      "id": "CSL-001",
      "component": "Deep-pan conveyor pans / overlap / bolts",
      "check": [
       {
        "label": null,
        "text": "Inspect missing pans, abrasive holes, distorted overlap and pan attachment."
       }
      ],
      "pass": "No leaking hot clinker or failed connection; replace pans.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CSL-002",
      "component": "Conveyor left/right chain links and pins",
      "check": [
       {
        "label": null,
        "text": "Inspect wear, elongation, pins, bushes and broken link locks."
       }
      ],
      "pass": "Chain elongation within OEM limits; renew worn sections.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "CSL-003",
      "component": "Pan conveyor rollers / track / rails",
      "check": [
       {
        "label": null,
        "text": "Inspect flat spots, wear, broken track supports and hot material spillage."
       }
      ],
      "pass": "Smooth running with intact track profile.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CSL-004",
      "component": "Drive sprocket / head shaft / key",
      "check": [
       {
        "label": null,
        "text": "Inspect tooth shape, wear, concentricity and shaft bearings at outage."
       }
      ],
      "pass": "No hooked teeth or slippage; refit worn parts.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "CSL-005",
      "component": "Tail/return sprocket / shaft / bearings",
      "check": [
       {
        "label": null,
        "text": "Inspect contamination, tension, shaft wear and retaining hardware."
       }
      ],
      "pass": "Free rotation and correct chain alignment.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "CSL-006",
      "component": "Conveyor take-up/adjuster / return tension",
      "check": [
       {
        "label": null,
        "text": "Inspect tensioner stroke, equal sides and locking nuts."
       }
      ],
      "pass": "Chain tension and tracking to OEM procedure.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "CSL-007",
      "component": "Conveyor head drive motor / VFD / MCC",
      "check": [
       {
        "label": null,
        "text": "Trend electrical current and trip history; check cooling."
       }
      ],
      "pass": "Current within OEM rating and matches clinker loading.",
      "freq": "Daily",
      "owner": "EL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CSL-008",
      "component": "Conveyor head gearbox and coupling",
      "check": [
       {
        "label": null,
        "text": "Inspect external lubrication, temperature, vibration and attachment bolts."
       }
      ],
      "pass": "No leakage or trending vibration abnormality.",
      "freq": "Weekly",
      "owner": "REL",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CSL-009",
      "component": "Head drive bearings and seals",
      "check": [
       {
        "label": null,
        "text": "Inspect temperature, grease condition and contaminant ingress."
       }
      ],
      "pass": "Normal lubrication and no visible leak.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CSL-011",
      "component": "Conveyor guarding / hood / inspection access",
      "check": [
       {
        "label": null,
        "text": "Check dust/hot-clinker escape, access latches and guards."
       }
      ],
      "pass": "No hot spillage; doors closed/locked.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CSL-012",
      "component": "Conveyor chute bends / wear plate / skirting",
      "check": [
       {
        "label": null,
        "text": "Inspect thickness and dust leakage, repair during isolated access."
       }
      ],
      "pass": "Clear discharge with adequate liner integrity.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CSL-013",
      "component": "Conveyor support trestles / anchor / catwalk",
      "check": [
       {
        "label": null,
        "text": "Check welds, settling, grating, handrails and thermal movement."
       }
      ],
      "pass": "No structural cracking or interference.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CSL-014",
      "component": "Conveyor dust-extraction points / flange gaskets",
      "check": [
       {
        "label": null,
        "text": "Inspect dust leakage and any installed pickup branches."
       }
      ],
      "pass": "No unsealed joints or clogged extract port.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "11.2",
    "title": "Clinker silo, bag filter, pulse system and extraction fan",
    "tasks": [
     {
      "id": "CSL-015",
      "component": "Clinker silo roof / shell / cone / supports",
      "check": [
       {
        "label": null,
        "text": "Inspect cracking, deformation, roof seal, discharge and steelwork corrosion."
       }
      ],
      "pass": "No leaks or structural deterioration.",
      "freq": "Quarterly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CSL-018",
      "component": "Silo manhole / vents / pressure relief",
      "check": [
       {
        "label": null,
        "text": "Check proper closure, vents and protection device per P&ID."
       }
      ],
      "pass": "No blocked vent; pressure device certified if installed.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CSL-019",
      "component": "Baghouse dirty-air inlet / clean- air outlet",
      "check": [
       {
        "label": null,
        "text": "Check duct leaks, supports, dust containment and flange integrity."
       }
      ],
      "pass": "No dust escape or false air.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CSL-020",
      "component": "Filter bags / cages / venturi if installed",
      "check": [
       {
        "label": null,
        "text": "Inspect bags for holes, degradation, seating, broken cages on isolated stop."
       }
      ],
      "pass": "No breakthrough or ripped cuff; replace per OEM grouping.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "CSL-021",
      "component": "Filter bag snap bands / tubesheet / gasket",
      "check": [
       {
        "label": null,
        "text": "Inspect seal seating, corrosion and missing bolts."
       }
      ],
      "pass": "Clean side free of dust bypass; renew defective seals.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "CSL-023",
      "component": "Pulse-cleaning compressed-air receiver",
      "check": [
       {
        "label": null,
        "text": "If pulse jet, check line pressure, condensate, regulator and approved receiver."
       }
      ],
      "pass": "Dry supply and no leaking manifold.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CSL-024",
      "component": "Pulse-cleaning solenoid valve bodies, pilot tubing and diaphragms",
      "check": [
       {
        "label": null,
        "text": "Inspect pneumatic pulse-valve hardware, tubing, valve seat, pilot coils and diaphragms after isolation and depressurization; signal tests are in sensor checklist."
       }
      ],
      "pass": "Each installed pulse actuates; renew faulty diaphragm.",
      "freq": "Planned stop",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CSL-025",
      "component": "Pulse-cleaning controller electrical assembly",
      "check": [
       {
        "label": null,
        "text": "Inspect cabinet enclosure, power supply, relay output modules and terminal integrity after electrical isolation; sensor/DP scaling tests are separate."
       }
      ],
      "pass": "Cabinet insulation, terminals, contacts, power module and enclosure safe and functional after authorized test.",
      "freq": "Planned stop",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CSL-026",
      "component": "Baghouse hopper / ash bin / dust screw or rotary valve",
      "check": [
       {
        "label": null,
        "text": "Verify hopper not flooded and discharge device not jammed."
       }
      ],
      "pass": "No dust backing up into bags; remove under dust-safe procedure.",
      "freq": "Daily",
      "owner": "OP",
      "mode": "RUN",
      "scope": "VERIFY"
     },
     {
      "id": "CSL-027",
      "component": "Baghouse access cover / explosion protection",
      "check": [
       {
        "label": null,
        "text": "Inspect access gaskets, external rupture indicators and grounding."
       }
      ],
      "pass": "All site hazard protections intact.",
      "freq": "Planned stop",
      "owner": "EH",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CSL-028",
      "component": "Dust collector fan impeller / casing",
      "check": [
       {
        "label": null,
        "text": "Inspect fan buildup, wear, dust leaks and impeller condition at shutdown."
       }
      ],
      "pass": "No contact / significant imbalance; repair if damaged.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN + STOP",
      "scope": "BASE"
     },
     {
      "id": "CSL-029",
      "component": "Clinker-silo dust extraction fan motor and MCC",
      "check": [
       {
        "label": null,
        "text": "Inspect motor enclosure, electrical terminals, cooling and power equipment at authorized isolation; electrical-current data-quality check is in sensor checklist."
       }
      ],
      "pass": "Motor enclosure, terminal hardware and power cabinet safe/undamaged; test results and WO recorded per electrical plan.",
      "freq": "Planned stop",
      "owner": "EL",
      "mode": "OFF",
      "scope": "BASE"
     },
     {
      "id": "CSL-030",
      "component": "Dust fan drive coupling / motor bearing / fan seals",
      "check": [
       {
        "label": null,
        "text": "Inspect seals, alignment, cooling and condition using safe route."
       }
      ],
      "pass": "No leaks, abnormal bearing heat or vibration trend.",
      "freq": "Monthly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     },
     {
      "id": "CSL-032",
      "component": "Dust collector access ladders and platforms",
      "check": [
       {
        "label": null,
        "text": "Check handrails, railings, bolts and dust buildup."
       }
      ],
      "pass": "Safe access and no fall hazard.",
      "freq": "Weekly",
      "owner": "ME",
      "mode": "RUN",
      "scope": "BASE"
     }
    ]
   },
   {
    "num": "11.3",
    "title": "Clinker silo ventilation additional safeguards",
    "tasks": [
     {
      "id": "CSL-033",
      "component": "Silo vent blowback check valve / pulse-air isolator",
      "check": [
       {
        "label": null,
        "text": "If installed, test correct orientation, loss-of-air behaviour and leak integrity."
       }
      ],
      "pass": "No reverse dust migration and safe pulse isolation.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "CSL-034",
      "component": "Silo filter hopper bridging and discharge damper",
      "check": [
       {
        "label": null,
        "text": "Inspect hopper bridging, vibrator or air pads where present; verify discharge-valve seal."
       }
      ],
      "pass": "No dust buildup or uncontrolled release; remove under isolated conditions.",
      "freq": "Planned stop",
      "owner": "ME",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 }
];

export const SENSOR_UNITS: ChecklistUnit[] = [
 {
  "code": "FSL-01",
  "title": "Raw-meal feed silo and extraction",
  "groups": [
   {
    "num": "2.1",
    "title": "Aeration blower motor and controller feedback",
    "tasks": [
     {
      "id": "SM001A",
      "tag": "ELE-FSL-01",
      "component": "Aeration blower motor current MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Selected duty aeration blower motor MCC / VFD electrical feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM001B",
      "tag": "ELE-FSL-01",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM005A",
      "tag": "STS-FSL-02",
      "component": "Duty/standby blower running/available Controller status",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Blower duty/standby PLC and control-cabinet available/run signals."
       },
       {
        "label": "Live Check",
        "text": "Confirm run/ready/fault/valid feedback follows actual equipment and alarm acknowledgements; identify frozen, latched or lost comms."
       }
      ],
      "pass": "Correct state, timing and asset mapping; no forced I/O, unrecorded bypass or unsafe interlock suppression.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM005B",
      "tag": "STS-FSL-02",
      "component": "Controller status",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect PLC channel label, terminal/wiring integrity and alarm event timestamp history at authorized cabinet."
       },
       {
        "label": "Planned Test",
        "text": "Use an approved scripted functional test at a planned stop or standby handover; verify contact polarity, transitions, reset and ULTRON mapping."
       }
      ],
      "pass": "Correct state, timing and asset mapping; no forced I/O, unrecorded bypass or unsafe interlock suppression.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "2.2",
    "title": "Silo roof, raw-meal inventory and level instrument",
    "tasks": [
     {
      "id": "SM002A",
      "tag": "LEV-FSL-01",
      "component": "Raw-meal silo continuous level Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Roof-mounted silo level antenna / nozzle at raw-meal silo."
       },
       {
        "label": "Live Check",
        "text": "Check echo/level-quality alarms, plausible fill/empty direction and comparison against material throughput or independent level."
       }
      ],
      "pass": "Healthy echo/diagnostic quality; correct direction and alarm test; no build-up preventing reliable measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM002B",
      "tag": "LEV-FSL-01",
      "component": "Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect mounting nozzle, flange seal and antenna window for dust or coating; clean ONLY when condition indicates and OEM permits."
       },
       {
        "label": "Planned Test",
        "text": "At safe vessel isolation verify empty/reference distance and configured blocking distance; verify alarm outputs and DCS scaling."
       }
      ],
      "pass": "Healthy echo/diagnostic quality; correct direction and alarm test; no build-up preventing reliable measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "2.3",
    "title": "Aeration distribution header pressure sensing",
    "tasks": [
     {
      "id": "SM003A",
      "tag": "PRS-FSL-01",
      "component": "Silo extraction/aeration header pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Common aeration/extraction air supply header, before silo cone pads."
       },
       {
        "label": "Live Check",
        "text": "Review pressure against blower / fan state, damper or valve position and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear measurement path, correct H/L orientation and calibration within plant-approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM003B",
      "tag": "PRS-FSL-01",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check tap, root valve, tubing and manifold for leaks; drain condensate from low points; keep the tap clear of dust."
       },
       {
        "label": "Planned Test",
        "text": "After isolation, verify a clear tap path and zero / span with a traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear measurement path, correct H/L orientation and calibration within plant-approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "2.4",
    "title": "Extraction gate position / limit status",
    "tasks": [
     {
      "id": "SM004A",
      "tag": "STS-FSL-01",
      "component": "Extraction gate open/closed or travel Controller status",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Silo extraction-gate actuator limit/position feedback."
       },
       {
        "label": "Live Check",
        "text": "Confirm run/ready/fault/valid feedback follows actual equipment and alarm acknowledgements; identify frozen, latched or lost comms."
       }
      ],
      "pass": "Correct state, timing and asset mapping; no forced I/O, unrecorded bypass or unsafe interlock suppression.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM004B",
      "tag": "STS-FSL-01",
      "component": "Controller status",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect PLC channel label, terminal/wiring integrity and alarm event timestamp history at authorized cabinet."
       },
       {
        "label": "Planned Test",
        "text": "Use an approved scripted functional test at a planned stop or standby handover; verify contact polarity, transitions, reset and ULTRON mapping."
       }
      ],
      "pass": "Correct state, timing and asset mapping; no forced I/O, unrecorded bypass or unsafe interlock suppression.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 },
 {
  "code": "KFS-01",
  "title": "Kiln feed and dosing",
  "groups": [
   {
    "num": "3.1",
    "title": "Bucket elevator bearing, head drive and speed pickup",
    "tasks": [
     {
      "id": "SM006A",
      "tag": "ELE-KFS-01",
      "component": "Elevator motor current MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Bucket elevator motor MCC / VFD electrical feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM006B",
      "tag": "ELE-KFS-01",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM014A",
      "tag": "SPD-KFS-01",
      "component": "Elevator underspeed / slip Speed / zero-speed",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Driven shaft at elevator boot or other actual- motion target."
       },
       {
        "label": "Live Check",
        "text": "Compare actual driven- element speed with process/command and shaft-motion plausibility; watch dropouts, underspeed and frozen feedback."
       }
      ],
      "pass": "Reliable pulses over operating range; correct shaft identity/direction/scaling; protective action checked with permits.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM014B",
      "tag": "SPD-KFS-01",
      "component": "Speed / zero-speed",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect noncontact pickup gap, target bolts/teeth, bracket stiffness, cable wear and metal buildup from safe position."
       },
       {
        "label": "Planned Test",
        "text": "With approved safe test verify pickup pulses and alarm setpoint using OEM test device/reference tachometer; test zero speed without bypassing protection."
       }
      ],
      "pass": "Reliable pulses over operating range; correct shaft identity/direction/scaling; protective action checked with permits.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM015A",
      "tag": "TMP-KFS-01",
      "component": "Bucket elevator head drive bearing temperature RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Bucket-elevator head drive bearing housing / embedded RTD."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM015B",
      "tag": "TMP-KFS-01",
      "component": "RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM016A",
      "tag": "VIB-KFS-01",
      "component": "Bucket elevator drive vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Elevator head drive bearing pedestal or gearbox housing."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM016B",
      "tag": "VIB-KFS-01",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "3.2",
    "title": "Air slide, conveying pressure and solid-flow meter",
    "tasks": [
     {
      "id": "SM007A",
      "tag": "FLO-KFS-01",
      "component": "Kiln-feed mass flow Solid-flow meter",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Solid-flow meter in the metered raw-meal feed transfer line."
       },
       {
        "label": "Live Check",
        "text": "Compare flow t/h with feed setpoint, inventory mass balance and feeder state; watch drift, noisy or flat data."
       }
      ],
      "pass": "Repeatable mass-flow vs reference in plant-accepted band; no plugged or mechanically altered sensor body.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM007B",
      "tag": "FLO-KFS-01",
      "component": "Solid-flow meter",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect measurement section, dust seals, air-slide/feeder condition, cable diagnostics and any OEM- approved pressure tapping."
       },
       {
        "label": "Planned Test",
        "text": "At approved stable test compare metered flow with independently validated bin-weight loss/totalization; apply OEM calibration/zero method."
       }
      ],
      "pass": "Repeatable mass-flow vs reference in plant-accepted band; no plugged or mechanically altered sensor body.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM012A",
      "tag": "PRS-KFS-01",
      "component": "Air-slide aeration chamber pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Aeration plenum below air-slide cloth."
       },
       {
        "label": "Live Check",
        "text": "Review pressure against blower / fan state, damper or valve position and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear measurement path, correct H/L orientation and calibration within plant-approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM012B",
      "tag": "PRS-KFS-01",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check tap, root valve, tubing and manifold for leaks; drain condensate from low points; keep the tap clear of dust."
       },
       {
        "label": "Planned Test",
        "text": "After isolation, verify a clear tap path and zero / span with a traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear measurement path, correct H/L orientation and calibration within plant-approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM013A",
      "tag": "PRS-KFS-02",
      "component": "Solid-flow-meter body / pressure interface Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Solid-flow meter pressure interface, only with OEM-approved port."
       },
       {
        "label": "Live Check",
        "text": "Review pressure/draft/DP against fan speed, valves and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Point is physically feasible and documented; otherwise mark NOT INSTALLED and raise D3 design hold.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM013B",
      "tag": "PRS-KFS-02",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Confirm pressure port is explicitly provided/approved by flow-meter OEM; inspect only if fitted."
       },
       {
        "label": "Planned Test",
        "text": "No drilling or connection modification without the OEM and process engineering approval; if installed verify zero/span and pressure-path security."
       }
      ],
      "pass": "Point is physically feasible and documented; otherwise mark NOT INSTALLED and raise D3 design hold.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "3.3",
    "title": "Kiln feed weigh-bin, weighing and dosing gate",
    "tasks": [
     {
      "id": "SM008A",
      "tag": "LEV-KFS-01",
      "component": "Kiln feed bin continuous level Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln-feed weigh-bin roof radar mounting nozzle."
       },
       {
        "label": "Live Check",
        "text": "Check echo/level-quality alarms, plausible fill/empty direction and comparison against material throughput or independent level."
       }
      ],
      "pass": "Healthy echo/diagnostic quality; correct direction and alarm test; no build-up preventing reliable measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM008B",
      "tag": "LEV-KFS-01",
      "component": "Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect mounting nozzle, flange seal and antenna window for dust or coating; clean ONLY when condition indicates and OEM permits."
       },
       {
        "label": "Planned Test",
        "text": "At safe vessel isolation verify empty/reference distance and configured blocking distance; verify alarm outputs and DCS scaling."
       }
      ],
      "pass": "Healthy echo/diagnostic quality; correct direction and alarm test; no build-up preventing reliable measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM009A",
      "tag": "LEV-KFS-02",
      "component": "Kiln feed bin high level Level radar / switch",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "High-level switch at verified upper bin elevation."
       },
       {
        "label": "Live Check",
        "text": "Verify level state agrees with measured inventory / local operational condition; flag stale or contradictory switch indications."
       }
      ],
      "pass": "Correct operation at site-approved point; no false trip or failed-to-change state; no bypass left active.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM009B",
      "tag": "LEV-KFS-02",
      "component": "Level radar / switch",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect switch head, cable gland, vessel penetration and wiring, confirm safe access and dust tightness."
       },
       {
        "label": "Planned Test",
        "text": "At isolated vessel/approved process test prove operation with manufacturer-specified method; confirm correct PLC alarm polarity and reset."
       }
      ],
      "pass": "Correct operation at site-approved point; no false trip or failed-to-change state; no bypass left active.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM010A",
      "tag": "LEV-KFS-03",
      "component": "Kiln feed bin low level Level radar / switch",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Low-level switch at verified lower bin elevation."
       },
       {
        "label": "Live Check",
        "text": "Verify level state agrees with measured inventory / local operational condition; flag stale or contradictory switch indications."
       }
      ],
      "pass": "Correct operation at site-approved point; no false trip or failed-to-change state; no bypass left active.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM010B",
      "tag": "LEV-KFS-03",
      "component": "Level radar / switch",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect switch head, cable gland, vessel penetration and wiring, confirm safe access and dust tightness."
       },
       {
        "label": "Planned Test",
        "text": "At isolated vessel/approved process test prove operation with manufacturer-specified method; confirm correct PLC alarm polarity and reset."
       }
      ],
      "pass": "Correct operation at site-approved point; no false trip or failed-to-change state; no bypass left active.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM011A",
      "tag": "POS-KFS-01",
      "component": "Feed control valve / dosing-gate position Position, limit and flow switches",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Kiln feed dosing valve / slide gate actuator and position feedback."
       },
       {
        "label": "Live Check",
        "text": "Trend limit/position/flow state against equipment movement or pressure/load; detect disagreement with command."
       }
      ],
      "pass": "Repeatable feedback over allowed motion/flow; correct PLC mapping and no persistent discrepancy.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM011B",
      "tag": "POS-KFS-01",
      "component": "Position, limit and flow switches",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect transmitter, cable/bracket, travel target, gland, actuator linkage and fittings without moving equipment unsafely."
       },
       {
        "label": "Planned Test",
        "text": "After isolation or OEM-safe test stroke confirm transitions at calibrated limits; verify end-to-end DCS alarms/interlocks and reset."
       }
      ],
      "pass": "Repeatable feedback over allowed motion/flow; correct PLC mapping and no persistent discrepancy.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM017A",
      "tag": "WGT-KFS-01",
      "component": "Kiln feed bin weight Load cells",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Load cells at individual weigh-bin supports / junction box."
       },
       {
        "label": "Live Check",
        "text": "Trend measured bin weight against radar inventory, filling and measured mass loss; detect drift or inconsistent load sharing."
       }
      ],
      "pass": "Repeatable weighing, stable unloaded zero and correct weight response; no bind or damaged support.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM017B",
      "tag": "WGT-KFS-01",
      "component": "Load cells",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect strain/load assemblies, supports, junction box, bonding, cable gland, grounding and mechanical binding."
       },
       {
        "label": "Planned Test",
        "text": "At approved maintenance window conduct zero/span using known test masses / validated calibration method; confirm full loop scaling."
       }
      ],
      "pass": "Repeatable weighing, stable unloaded zero and correct weight response; no bind or damaged support.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 },
 {
  "code": "PHC-01",
  "title": "Six-stage preheater and ID fan",
  "groups": [
   {
    "num": "4.1",
    "title": "Induced-draft fan, bearings, MCC/VFD and damper",
    "tasks": [
     {
      "id": "SM018A",
      "tag": "ELE-PHC-01",
      "component": "ID fan electrical power MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Preheater ID fan motor MCC / VFD feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM018B",
      "tag": "ELE-PHC-01",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM021A",
      "tag": "POS-PHC-01",
      "component": "ID fan damper position Position, limit and flow switches",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "ID fan inlet damper actuator actual position feedback."
       },
       {
        "label": "Live Check",
        "text": "Trend limit/position/flow state against equipment movement or pressure/load; detect disagreement with command."
       }
      ],
      "pass": "Repeatable feedback over allowed motion/flow; correct PLC mapping and no persistent discrepancy.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM021B",
      "tag": "POS-PHC-01",
      "component": "Position, limit and flow switches",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect transmitter, cable/bracket, travel target, gland, actuator linkage and fittings without moving equipment unsafely."
       },
       {
        "label": "Planned Test",
        "text": "After isolation or OEM-safe test stroke confirm transitions at calibrated limits; verify end-to-end DCS alarms/interlocks and reset."
       }
      ],
      "pass": "Repeatable feedback over allowed motion/flow; correct PLC mapping and no persistent discrepancy.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM031A",
      "tag": "SPD-PHC-01",
      "component": "ID fan speed feedback Speed / zero-speed",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "ID fan actual speed/tachometer or verified VFD feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare actual driven- element speed with process/command and shaft-motion plausibility; watch dropouts, underspeed and frozen feedback."
       }
      ],
      "pass": "Reliable pulses over operating range; correct shaft identity/direction/scaling; protective action checked with permits.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM031B",
      "tag": "SPD-PHC-01",
      "component": "Speed / zero-speed",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect noncontact pickup gap, target bolts/teeth, bracket stiffness, cable wear and metal buildup from safe position."
       },
       {
        "label": "Planned Test",
        "text": "With approved safe test verify pickup pulses and alarm setpoint using OEM test device/reference tachometer; test zero speed without bypassing protection."
       }
      ],
      "pass": "Reliable pulses over operating range; correct shaft identity/direction/scaling; protective action checked with permits.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM040A",
      "tag": "TMP-PHC-09",
      "component": "ID fan DE bearing temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "ID fan DE bearing housing RTD."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM040B",
      "tag": "TMP-PHC-09",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM041A",
      "tag": "TMP-PHC-10",
      "component": "ID fan NDE bearing temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "ID fan NDE bearing housing RTD."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM041B",
      "tag": "TMP-PHC-10",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM042A",
      "tag": "VIB-PHC-01",
      "component": "ID fan DE vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "ID fan DE stationary bearing pedestal."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM042B",
      "tag": "VIB-PHC-01",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM043A",
      "tag": "VIB-PHC-02",
      "component": "ID fan NDE vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "ID fan NDE stationary bearing pedestal."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM043B",
      "tag": "VIB-PHC-02",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.2",
    "title": "Preheater-exit gas analyser and sampling system",
    "tasks": [
     {
      "id": "SM019A",
      "tag": "GAS-PHC-01",
      "component": "Preheater exit oxygen Gas analyser channel",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "C1 preheater-exit gas sampling location; analyser O /CO channel. 2"
       },
       {
        "label": "Live Check",
        "text": "Review channel concentration together with sample/diagnostic validity, blowback state, flow and gas-path temperature."
       }
      ],
      "pass": "Valid sampling path; channel recovers from blowback; certified-gas error and response time inside OEM/plant limits.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM019B",
      "tag": "GAS-PHC-01",
      "component": "Gas analyser channel",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check sample probe, filter DP, heated line, leak-tight fittings, cooler/dryer (if used), zero/span gas shelf life and utilities."
       },
       {
        "label": "Planned Test",
        "text": "Under approved gas-safety procedure verify span/zero for THIS species with certified gases, response time, alarm validity and DCS mapping."
       }
      ],
      "pass": "Valid sampling path; channel recovers from blowback; certified-gas error and response time inside OEM/plant limits.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM020A",
      "tag": "GAS-PHC-02",
      "component": "Preheater exit CO Gas analyser channel",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "C1 preheater-exit gas sampling location; analyser O /CO channel. 2"
       },
       {
        "label": "Live Check",
        "text": "Review channel concentration together with sample/diagnostic validity, blowback state, flow and gas-path temperature."
       }
      ],
      "pass": "Valid sampling path; channel recovers from blowback; certified-gas error and response time inside OEM/plant limits.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM020B",
      "tag": "GAS-PHC-02",
      "component": "Gas analyser channel",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check sample probe, filter DP, heated line, leak-tight fittings, cooler/dryer (if used), zero/span gas shelf life and utilities."
       },
       {
        "label": "Planned Test",
        "text": "Under approved gas-safety procedure verify span/zero for THIS species with certified gases, response time, alarm validity and DCS mapping."
       }
      ],
      "pass": "Valid sampling path; channel recovers from blowback; certified-gas error and response time inside OEM/plant limits.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.3",
    "title": "Cyclone C1 gas draft measuring point",
    "tasks": [
     {
      "id": "SM022A",
      "tag": "PRS-PHC-01",
      "component": "C1 / preheater outlet draft Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "C1 cyclone draft / gas-pressure tap with approved purging."
       },
       {
        "label": "Live Check",
        "text": "Review pressure/draft/DP against fan speed, valves and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM022B",
      "tag": "PRS-PHC-01",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check purge supply, tap and impulse line integrity, manifolds, leaks, line support and condensate; keep hot/dusty connections closed in service."
       },
       {
        "label": "Planned Test",
        "text": "Only after safe isolation and depressurizing, verify clear tap/impulse path and zero/span using traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.4",
    "title": "Cyclone C2 gas draft measuring point",
    "tasks": [
     {
      "id": "SM023A",
      "tag": "PRS-PHC-02",
      "component": "C2 draft Pressure / differential pressure",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "C2 cyclone draft / gas-pressure tap with approved purging."
       },
       {
        "label": "Live Check",
        "text": "Review pressure/draft/DP against fan speed, valves and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM023B",
      "tag": "PRS-PHC-02",
      "component": "Pressure / differential pressure",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Check purge supply, tap and impulse line integrity, manifolds, leaks, line support and condensate; keep hot/dusty connections closed in service."
       },
       {
        "label": "Planned Test",
        "text": "Only after safe isolation and depressurizing, verify clear tap/impulse path and zero/span using traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.5",
    "title": "Cyclone C3 gas draft measuring point",
    "tasks": [
     {
      "id": "SM024A",
      "tag": "PRS-PHC-03",
      "component": "C3 draft Pressure / differential pressure",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "C3 cyclone draft / gas-pressure tap with approved purging."
       },
       {
        "label": "Live Check",
        "text": "Review pressure/draft/DP against fan speed, valves and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM024B",
      "tag": "PRS-PHC-03",
      "component": "Pressure / differential pressure",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Check purge supply, tap and impulse line integrity, manifolds, leaks, line support and condensate; keep hot/dusty connections closed in service."
       },
       {
        "label": "Planned Test",
        "text": "Only after safe isolation and depressurizing, verify clear tap/impulse path and zero/span using traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.6",
    "title": "Cyclone C4 gas draft measuring point",
    "tasks": [
     {
      "id": "SM025A",
      "tag": "PRS-PHC-04",
      "component": "C4 draft Pressure / differential pressure",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "C4 cyclone draft / gas-pressure tap with approved purging."
       },
       {
        "label": "Live Check",
        "text": "Review pressure/draft/DP against fan speed, valves and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM025B",
      "tag": "PRS-PHC-04",
      "component": "Pressure / differential pressure",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Check purge supply, tap and impulse line integrity, manifolds, leaks, line support and condensate; keep hot/dusty connections closed in service."
       },
       {
        "label": "Planned Test",
        "text": "Only after safe isolation and depressurizing, verify clear tap/impulse path and zero/span using traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.7",
    "title": "Cyclone C5 gas draft measuring point",
    "tasks": [
     {
      "id": "SM026A",
      "tag": "PRS-PHC-05",
      "component": "C5 draft Pressure / differential pressure",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "C5 cyclone draft / gas-pressure tap with approved purging."
       },
       {
        "label": "Live Check",
        "text": "Review pressure/draft/DP against fan speed, valves and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM026B",
      "tag": "PRS-PHC-05",
      "component": "Pressure / differential pressure",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Check purge supply, tap and impulse line integrity, manifolds, leaks, line support and condensate; keep hot/dusty connections closed in service."
       },
       {
        "label": "Planned Test",
        "text": "Only after safe isolation and depressurizing, verify clear tap/impulse path and zero/span using traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.8",
    "title": "Cyclone C6 gas draft measuring point",
    "tasks": [
     {
      "id": "SM027A",
      "tag": "PRS-PHC-06",
      "component": "C6/riser draft Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "C6 cyclone draft / gas-pressure tap with approved purging."
       },
       {
        "label": "Live Check",
        "text": "Review pressure/draft/DP against fan speed, valves and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM027B",
      "tag": "PRS-PHC-06",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check purge supply, tap and impulse line integrity, manifolds, leaks, line support and condensate; keep hot/dusty connections closed in service."
       },
       {
        "label": "Planned Test",
        "text": "Only after safe isolation and depressurizing, verify clear tap/impulse path and zero/span using traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.9",
    "title": "Cyclone C4 cone purged-pressure measurement",
    "tasks": [
     {
      "id": "SM028A",
      "tag": "PRS-PHC-07",
      "component": "C4 cone pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "C4 lower cyclone cone pressure tap with approved purging."
       },
       {
        "label": "Live Check",
        "text": "Check cone pressure variability and signal validity against adjacent cyclone drafts; steady values alone do NOT prove a blockage."
       }
      ],
      "pass": "Clear purged tap, plausible response during material changes and consistent pressure reference.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM028B",
      "tag": "PRS-PHC-07",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify installed purge air is dry/available; inspect cleanable tap and tubing with plant-approved safe procedure."
       },
       {
        "label": "Planned Test",
        "text": "At controlled stop clean blocked cone port, leak-test manifold and verify transmitter zero/span."
       }
      ],
      "pass": "Clear purged tap, plausible response during material changes and consistent pressure reference.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.10",
    "title": "Cyclone C5 cone purged-pressure measurement",
    "tasks": [
     {
      "id": "SM029A",
      "tag": "PRS-PHC-08",
      "component": "C5 cone pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "C5 lower cyclone cone pressure tap with approved purging."
       },
       {
        "label": "Live Check",
        "text": "Check cone pressure variability and signal validity against adjacent cyclone drafts; steady values alone do NOT prove a blockage."
       }
      ],
      "pass": "Clear purged tap, plausible response during material changes and consistent pressure reference.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM029B",
      "tag": "PRS-PHC-08",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify installed purge air is dry/available; inspect cleanable tap and tubing with plant-approved safe procedure."
       },
       {
        "label": "Planned Test",
        "text": "At controlled stop clean blocked cone port, leak-test manifold and verify transmitter zero/span."
       }
      ],
      "pass": "Clear purged tap, plausible response during material changes and consistent pressure reference.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.11",
    "title": "Cyclone C6 cone purged-pressure measurement",
    "tasks": [
     {
      "id": "SM030A",
      "tag": "PRS-PHC-09",
      "component": "C6 cone pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "C6 lower cyclone cone pressure tap with approved purging."
       },
       {
        "label": "Live Check",
        "text": "Check cone pressure variability and signal validity against adjacent cyclone drafts; steady values alone do NOT prove a blockage."
       }
      ],
      "pass": "Clear purged tap, plausible response during material changes and consistent pressure reference.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM030B",
      "tag": "PRS-PHC-09",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify installed purge air is dry/available; inspect cleanable tap and tubing with plant-approved safe procedure."
       },
       {
        "label": "Planned Test",
        "text": "At controlled stop clean blocked cone port, leak-test manifold and verify transmitter zero/span."
       }
      ],
      "pass": "Clear purged tap, plausible response during material changes and consistent pressure reference.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.12",
    "title": "Cyclone C1 gas-temperature measuring point",
    "tasks": [
     {
      "id": "SM032A",
      "tag": "TMP-PHC-01",
      "component": "C1 gas outlet temperature Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "C1 cyclone gas outlet thermocouple/thermowell."
       },
       {
        "label": "Live Check",
        "text": "Review stage/process temperature trend, open-circuit alarms, spikes and step changes relative to other stages and operating mode."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM032B",
      "tag": "TMP-PHC-01",
      "component": "Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify cable protection, extension-wire polarity, junction-head seal and measuring-point condition from approved access."
       },
       {
        "label": "Planned Test",
        "text": "At cooled, isolated shutdown inspect sheath/thermowell for erosion and replace if damaged; simulate input at transmitter, verify cold-junction compensation and verify DCS scaling."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.13",
    "title": "Cyclone C2 gas-temperature measuring point",
    "tasks": [
     {
      "id": "SM033A",
      "tag": "TMP-PHC-02",
      "component": "C2 gas outlet temperature Thermocouple",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "C2 cyclone gas outlet thermocouple/thermowell."
       },
       {
        "label": "Live Check",
        "text": "Review stage/process temperature trend, open-circuit alarms, spikes and step changes relative to other stages and operating mode."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM033B",
      "tag": "TMP-PHC-02",
      "component": "Thermocouple",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify cable protection, extension-wire polarity, junction-head seal and measuring-point condition from approved access."
       },
       {
        "label": "Planned Test",
        "text": "At cooled, isolated shutdown inspect sheath/thermowell for erosion and replace if damaged; simulate input at transmitter, verify cold-junction compensation and verify DCS scaling."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.14",
    "title": "Cyclone C3 gas-temperature measuring point",
    "tasks": [
     {
      "id": "SM034A",
      "tag": "TMP-PHC-03",
      "component": "C3 gas outlet temperature Thermocouple",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "C3 cyclone gas outlet thermocouple/thermowell."
       },
       {
        "label": "Live Check",
        "text": "Review stage/process temperature trend, open-circuit alarms, spikes and step changes relative to other stages and operating mode."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM034B",
      "tag": "TMP-PHC-03",
      "component": "Thermocouple",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify cable protection, extension-wire polarity, junction-head seal and measuring-point condition from approved access."
       },
       {
        "label": "Planned Test",
        "text": "At cooled, isolated shutdown inspect sheath/thermowell for erosion and replace if damaged; simulate input at transmitter, verify cold-junction compensation and verify DCS scaling."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.15",
    "title": "Cyclone C4 gas-temperature measuring point",
    "tasks": [
     {
      "id": "SM035A",
      "tag": "TMP-PHC-04",
      "component": "C4 gas outlet temperature Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "C4 cyclone gas outlet thermocouple/thermowell."
       },
       {
        "label": "Live Check",
        "text": "Review stage/process temperature trend, open-circuit alarms, spikes and step changes relative to other stages and operating mode."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM035B",
      "tag": "TMP-PHC-04",
      "component": "Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify cable protection, extension-wire polarity, junction-head seal and measuring-point condition from approved access."
       },
       {
        "label": "Planned Test",
        "text": "At cooled, isolated shutdown inspect sheath/thermowell for erosion and replace if damaged; simulate input at transmitter, verify cold-junction compensation and verify DCS scaling."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.16",
    "title": "Cyclone C5 gas-temperature measuring point",
    "tasks": [
     {
      "id": "SM036A",
      "tag": "TMP-PHC-05",
      "component": "C5 gas outlet temperature Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "C5 cyclone gas outlet thermocouple/thermowell."
       },
       {
        "label": "Live Check",
        "text": "Review stage/process temperature trend, open-circuit alarms, spikes and step changes relative to other stages and operating mode."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM036B",
      "tag": "TMP-PHC-05",
      "component": "Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify cable protection, extension-wire polarity, junction-head seal and measuring-point condition from approved access."
       },
       {
        "label": "Planned Test",
        "text": "At cooled, isolated shutdown inspect sheath/thermowell for erosion and replace if damaged; simulate input at transmitter, verify cold-junction compensation and verify DCS scaling."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.17",
    "title": "Cyclone C6 gas-temperature measuring point",
    "tasks": [
     {
      "id": "SM037A",
      "tag": "TMP-PHC-06",
      "component": "C6 gas outlet temperature Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "C6 cyclone gas outlet thermocouple/thermowell."
       },
       {
        "label": "Live Check",
        "text": "Review stage/process temperature trend, open-circuit alarms, spikes and step changes relative to other stages and operating mode."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM037B",
      "tag": "TMP-PHC-06",
      "component": "Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify cable protection, extension-wire polarity, junction-head seal and measuring-point condition from approved access."
       },
       {
        "label": "Planned Test",
        "text": "At cooled, isolated shutdown inspect sheath/thermowell for erosion and replace if damaged; simulate input at transmitter, verify cold-junction compensation and verify DCS scaling."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.18",
    "title": "Final hot-meal chute measurement",
    "tasks": [
     {
      "id": "SM038A",
      "tag": "TMP-PHC-07",
      "component": "Final meal temperature to kiln Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Final hot-meal chute discharging from C6 to kiln inlet."
       },
       {
        "label": "Live Check",
        "text": "Review stage/process temperature trend, open-circuit alarms, spikes and step changes relative to other stages and operating mode."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM038B",
      "tag": "TMP-PHC-07",
      "component": "Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify cable protection, extension-wire polarity, junction-head seal and measuring-point condition from approved access."
       },
       {
        "label": "Planned Test",
        "text": "At cooled, isolated shutdown inspect sheath/thermowell for erosion and replace if damaged; simulate input at transmitter, verify cold-junction compensation and verify DCS scaling."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "4.19",
    "title": "Kiln riser duct temperature instrument",
    "tasks": [
     {
      "id": "SM039A",
      "tag": "TMP-PHC-08",
      "component": "Riser duct gas temperature Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln riser duct gas thermocouple."
       },
       {
        "label": "Live Check",
        "text": "Review stage/process temperature trend, open- circuit alarms, spikes and step changes relative to other stages and operating mode."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM039B",
      "tag": "TMP-PHC-08",
      "component": "Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify cable protection, extension-wire polarity, junction-head seal and measuring-point condition from approved access."
       },
       {
        "label": "Planned Test",
        "text": "At cooled, isolated shutdown inspect sheath/thermowell for erosion and replace if damaged; simulate input at transmitter, verify cold-junction compensation and verify DCS scaling."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 },
 {
  "code": "KLN-01",
  "title": "Rotary kiln, drives and auxiliaries",
  "groups": [
   {
    "num": "5.1",
    "title": "Main drive motor, gearbox, pinion and kiln speed monitoring",
    "tasks": [
     {
      "id": "SM044A",
      "tag": "ELE-KLN-01",
      "component": "Main motor current/power/torque if available MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Main kiln-drive motor MCC / VFD torque/current/power feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM044B",
      "tag": "ELE-KLN-01",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM073A",
      "tag": "SPD-KLN-01",
      "component": "Kiln speed feedback Speed / zero-speed",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln shell / tyre reference pickup preferred; where the D5 source is VFD / encoder speed, validate it against a shell reference (D5 alignment raised)."
       },
       {
        "label": "Live Check",
        "text": "Compare actual driven-element speed with process/command and shaft- motion plausibility; watch dropouts, underspeed and frozen feedback."
       }
      ],
      "pass": "Reliable pulses over operating range; correct shaft identity/direction/scaling; protective action checked with permits.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM073B",
      "tag": "SPD-KLN-01",
      "component": "Speed / zero-speed",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect noncontact pickup gap, target bolts/teeth, bracket stiffness, cable wear and metal buildup from safe position."
       },
       {
        "label": "Planned Test",
        "text": "With approved safe test verify pickup pulses and alarm setpoint using OEM test device/reference tachometer; test zero speed without bypassing protection."
       }
      ],
      "pass": "Reliable pulses over operating range; correct shaft identity/direction/scaling; protective action checked with permits.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM093A",
      "tag": "TMP-KLN-19",
      "component": "Motor DE bearing temperature RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Main kiln motor DE bearing RTD."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM093B",
      "tag": "TMP-KLN-19",
      "component": "RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM094A",
      "tag": "TMP-KLN-20",
      "component": "Motor NDE bearing temperature RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Main kiln motor NDE bearing RTD."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM094B",
      "tag": "TMP-KLN-20",
      "component": "RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM095A",
      "tag": "TMP-KLN-21",
      "component": "Motor winding temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Main kiln motor embedded winding RTD."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM095B",
      "tag": "TMP-KLN-21",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM096A",
      "tag": "TMP-KLN-22",
      "component": "Gearbox input bearing temperature RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Reduction gearbox input bearing RTD."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM096B",
      "tag": "TMP-KLN-22",
      "component": "RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM097A",
      "tag": "TMP-KLN-23",
      "component": "Gearbox output bearing temperature RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Reduction gearbox output bearing RTD."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM097B",
      "tag": "TMP-KLN-23",
      "component": "RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM101A",
      "tag": "VIB-KLN-01",
      "component": "Motor DE vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Main kiln motor DE bearing housing."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM101B",
      "tag": "VIB-KLN-01",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM102A",
      "tag": "VIB-KLN-02",
      "component": "Gearbox input vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Reduction gearbox input bearing housing."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM102B",
      "tag": "VIB-KLN-02",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM103A",
      "tag": "VIB-KLN-03",
      "component": "Gearbox output vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Reduction gearbox output bearing housing."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM103B",
      "tag": "VIB-KLN-03",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM104A",
      "tag": "VIB-KLN-04",
      "component": "Pinion vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Pinion shaft bearing block (stationary housing)."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM104B",
      "tag": "VIB-KLN-04",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.2",
    "title": "Gearbox forced-oil lubrication monitoring",
    "tasks": [
     {
      "id": "SM045A",
      "tag": "FLO-KLN-05",
      "component": "Gearbox oil flow switch Position, limit and flow switches",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Gearbox forced-oil supply / flow-switch location."
       },
       {
        "label": "Live Check",
        "text": "Confirm flow-switch state agrees with pump running state and oil pressure; flag contradictory or frozen state."
       }
      ],
      "pass": "Switch changes state at the approved flow; correct PLC mapping; no bypass left active.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM045B",
      "tag": "FLO-KLN-05",
      "component": "Position, limit and flow switches",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect switch body, sensing element housing, cable gland and wiring; confirm no oil leak."
       },
       {
        "label": "Planned Test",
        "text": "Prove the switch by flow interruption at a controlled duty / standby pump changeover or isolated test; confirm alarm / interlock response, PLC polarity and reset."
       }
      ],
      "pass": "Switch changes state at the approved flow; correct PLC mapping; no bypass left active.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM049A",
      "tag": "LEV-KLN-01",
      "component": "Gearbox oil low level Level radar / switch",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Main reduction gearbox lubrication reservoir low-level device."
       },
       {
        "label": "Live Check",
        "text": "Verify level state agrees with measured inventory / local operational condition; flag stale or contradictory switch indications."
       }
      ],
      "pass": "Correct operation at site-approved point; no false trip or failed-to-change state; no bypass left active.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM049B",
      "tag": "LEV-KLN-01",
      "component": "Level radar / switch",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect switch head, cable gland, vessel penetration and wiring, confirm safe access and dust tightness."
       },
       {
        "label": "Planned Test",
        "text": "At isolated vessel/approved process test prove operation with manufacturer-specified method; confirm correct PLC alarm polarity and reset."
       }
      ],
      "pass": "Correct operation at site-approved point; no false trip or failed-to-change state; no bypass left active.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM064A",
      "tag": "PRS-KLN-04",
      "component": "Gearbox oil pressure / status Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Gearbox lubrication pump supply header pressure tapping."
       },
       {
        "label": "Live Check",
        "text": "Review pressure against pump / HPU state, oil temperature and load; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Leak-free connection, correct range and scaling, calibration within plant-approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM064B",
      "tag": "PRS-KLN-04",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check transmitter, root valve, manifold and tubing for leaks; compare with the local gauge where fitted; never loosen pressurised oil fittings."
       },
       {
        "label": "Planned Test",
        "text": "After isolation and depressurising, verify zero / span with a traceable pressure source, restore root and manifold valves and confirm alarm setpoint and DCS scaling."
       }
      ],
      "pass": "Leak-free connection, correct range and scaling, calibration within plant-approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM065A",
      "tag": "PRS-KLN-05",
      "component": "Gearbox filter differential pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Across gearbox oil-filter dirty and clean sides (DP)."
       },
       {
        "label": "Live Check",
        "text": "Trend gearbox oil-filter differential pressure with oil temperature, pump operating state and flow; check both signal polarity and bypass alarms."
       }
      ],
      "pass": "No leaking or blocked lines; correct dirty-clean orientation; post-service DP change physically plausible.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM065B",
      "tag": "PRS-KLN-05",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect high/low impulse lines at filter inlet/outlet, isolation/equalizing valves and leakage - do not vent hot pressurized oil."
       },
       {
        "label": "Planned Test",
        "text": "Under LOTO verify DP zero with equalized inputs, span with reference source and reduction after known filter service."
       }
      ],
      "pass": "No leaking or blocked lines; correct dirty-clean orientation; post-service DP change physically plausible.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM092A",
      "tag": "TMP-KLN-15",
      "component": "Gearbox oil temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Gearbox oil tank or return-side RTD."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM092B",
      "tag": "TMP-KLN-15",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.3",
    "title": "Kiln inlet temperatures, draft and gas analysers",
    "tasks": [
     {
      "id": "SM046A",
      "tag": "GAS-KLN-01",
      "component": "Kiln inlet O 2 Gas analyser channel",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln-inlet smoke chamber sample probe and shared O /CO/NO analyser. 2 x"
       },
       {
        "label": "Live Check",
        "text": "Review channel concentration together with sample/diagnostic validity, blowback state, flow and gas-path temperature."
       }
      ],
      "pass": "Valid sampling path; channel recovers from blowback; certified-gas error and response time inside OEM/plant limits.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM046B",
      "tag": "GAS-KLN-01",
      "component": "Gas analyser channel",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check probe cooling water / air flow and outlet temperature (kiln-inlet probes operate in gas above 1,000 °C). Check sample probe, filter DP, heated line, leak-tight fittings, cooler/dryer (if used), zero/span gas shelf life and utilities."
       },
       {
        "label": "Planned Test",
        "text": "Under approved gas-safety procedure verify span/zero for THIS species with certified gases, response time, alarm validity and DCS mapping."
       }
      ],
      "pass": "Valid sampling path; channel recovers from blowback; certified-gas error and response time inside OEM/plant limits.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM047A",
      "tag": "GAS-KLN-02",
      "component": "Kiln inlet CO Gas analyser channel",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln-inlet smoke chamber sample probe and shared O /CO/NO analyser. 2 x"
       },
       {
        "label": "Live Check",
        "text": "Review channel concentration together with sample/diagnostic validity, blowback state, flow and gas-path temperature."
       }
      ],
      "pass": "Valid sampling path; channel recovers from blowback; certified-gas error and response time inside OEM/plant limits.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM047B",
      "tag": "GAS-KLN-02",
      "component": "Gas analyser channel",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check probe cooling water / air flow and outlet temperature (kiln-inlet probes operate in gas above 1,000 °C). Check sample probe, filter DP, heated line, leak-tight fittings, cooler/dryer (if used), zero/span gas shelf life and utilities."
       },
       {
        "label": "Planned Test",
        "text": "Under approved gas-safety procedure verify span/zero for THIS species with certified gases, response time, alarm validity and DCS mapping."
       }
      ],
      "pass": "Valid sampling path; channel recovers from blowback; certified-gas error and response time inside OEM/plant limits.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM048A",
      "tag": "GAS-KLN-03",
      "component": "Kiln-inlet NO x Gas analyser channel",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln-inlet smoke chamber sample probe and shared O /CO/NO analyser. 2 x"
       },
       {
        "label": "Live Check",
        "text": "Review channel concentration together with sample/diagnostic validity, blowback state, flow and gas-path temperature."
       }
      ],
      "pass": "Valid sampling path; channel recovers from blowback; certified-gas error and response time inside OEM/plant limits.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM048B",
      "tag": "GAS-KLN-03",
      "component": "Gas analyser channel",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check probe cooling water / air flow and outlet temperature (kiln-inlet probes operate in gas above 1,000 °C). Check sample probe, filter DP, heated line, leak-tight fittings, cooler/dryer (if used), zero/span gas shelf life and utilities."
       },
       {
        "label": "Planned Test",
        "text": "Under approved gas-safety procedure verify span/zero for THIS species with certified gases, response time, alarm validity and DCS mapping."
       }
      ],
      "pass": "Valid sampling path; channel recovers from blowback; certified-gas error and response time inside OEM/plant limits.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM062A",
      "tag": "PRS-KLN-01",
      "component": "Kiln-inlet draft Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln stationary inlet / smoke chamber draft tapping."
       },
       {
        "label": "Live Check",
        "text": "Review pressure/draft/DP against fan speed, valves and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM062B",
      "tag": "PRS-KLN-01",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check purge supply, tap and impulse line integrity, manifolds, leaks, line support and condensate; keep hot/dusty connections closed in service."
       },
       {
        "label": "Planned Test",
        "text": "Only after safe isolation and depressurizing, verify clear tap/impulse path and zero/span using traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM075A",
      "tag": "STS-KLN-06",
      "component": "Gas analyzer validity/status Controller status",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Kiln inlet gas analyser diagnostics and sample-validity output."
       },
       {
        "label": "Live Check",
        "text": "Confirm run/ready/fault/valid feedback follows actual equipment and alarm acknowledgements; identify frozen, latched or lost comms."
       }
      ],
      "pass": "Correct state, timing and asset mapping; no forced I/O, unrecorded bypass or unsafe interlock suppression.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM075B",
      "tag": "STS-KLN-06",
      "component": "Controller status",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect PLC channel label, terminal/wiring integrity and alarm event timestamp history at authorized cabinet."
       },
       {
        "label": "Planned Test",
        "text": "Use an approved scripted functional test at a planned stop or standby handover; verify contact polarity, transitions, reset and ULTRON mapping."
       }
      ],
      "pass": "Correct state, timing and asset mapping; no forced I/O, unrecorded bypass or unsafe interlock suppression.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM090A",
      "tag": "TMP-KLN-13",
      "component": "Kiln-inlet gas temperature Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln inlet smoke chamber gas thermocouple / thermowell."
       },
       {
        "label": "Live Check",
        "text": "Review stage/process temperature trend, open-circuit alarms, spikes and step changes relative to other stages and operating mode."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM090B",
      "tag": "TMP-KLN-13",
      "component": "Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify cable protection, extension-wire polarity, junction-head seal and measuring-point condition from approved access."
       },
       {
        "label": "Planned Test",
        "text": "At cooled, isolated shutdown inspect sheath/thermowell for erosion and replace if damaged; simulate input at transmitter, verify cold-junction compensation and verify DCS scaling."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.4",
    "title": "Support station 1 - roller oil level",
    "tasks": [
     {
      "id": "SM050A",
      "tag": "LEV-KLN-02",
      "component": "Support roller 1 oil bath low level Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Support roller 1, oil-bath level switch (station 1); verify lubrication architecture."
       },
       {
        "label": "Live Check",
        "text": "Verify level state agrees with measured inventory / local operational condition; flag stale or contradictory switch indications."
       }
      ],
      "pass": "Correct low-level switch function only where reservoir architecture supports it; record N/A otherwise.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM050B",
      "tag": "LEV-KLN-02",
      "component": "Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "First verify the support roller uses a local oil bath / reservoir; centralized lubrication may remove this measurement."
       },
       {
        "label": "Planned Test",
        "text": "At approved stop function-test the installed low-oil-level device; do not drain hot lubricating oil unsafely."
       }
      ],
      "pass": "Correct low-level switch function only where reservoir architecture supports it; record N/A otherwise.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM051A",
      "tag": "LEV-KLN-03",
      "component": "Support roller 2 oil bath low level Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Support roller 2, oil-bath level switch (station 1); verify lubrication architecture."
       },
       {
        "label": "Live Check",
        "text": "Verify level state agrees with measured inventory / local operational condition; flag stale or contradictory switch indications."
       }
      ],
      "pass": "Correct low-level switch function only where reservoir architecture supports it; record N/A otherwise.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM051B",
      "tag": "LEV-KLN-03",
      "component": "Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "First verify the support roller uses a local oil bath / reservoir; centralized lubrication may remove this measurement."
       },
       {
        "label": "Planned Test",
        "text": "At approved stop function-test the installed low-oil-level device; do not drain hot lubricating oil unsafely."
       }
      ],
      "pass": "Correct low-level switch function only where reservoir architecture supports it; record N/A otherwise.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.5",
    "title": "Support station 2 - roller oil level",
    "tasks": [
     {
      "id": "SM052A",
      "tag": "LEV-KLN-04",
      "component": "Support roller 3 oil bath low level Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Support roller 3, oil-bath level switch (station 2); verify lubrication architecture."
       },
       {
        "label": "Live Check",
        "text": "Verify level state agrees with measured inventory / local operational condition; flag stale or contradictory switch indications."
       }
      ],
      "pass": "Correct low-level switch function only where reservoir architecture supports it; record N/A otherwise.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM052B",
      "tag": "LEV-KLN-04",
      "component": "Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "First verify the support roller uses a local oil bath / reservoir; centralized lubrication may remove this measurement."
       },
       {
        "label": "Planned Test",
        "text": "At approved stop function-test the installed low-oil-level device; do not drain hot lubricating oil unsafely."
       }
      ],
      "pass": "Correct low-level switch function only where reservoir architecture supports it; record N/A otherwise.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM053A",
      "tag": "LEV-KLN-05",
      "component": "Support roller 4 oil bath low level Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Support roller 4, oil-bath level switch (station 2); verify lubrication architecture."
       },
       {
        "label": "Live Check",
        "text": "Verify level state agrees with measured inventory / local operational condition; flag stale or contradictory switch indications."
       }
      ],
      "pass": "Correct low-level switch function only where reservoir architecture supports it; record N/A otherwise.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM053B",
      "tag": "LEV-KLN-05",
      "component": "Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "First verify the support roller uses a local oil bath / reservoir; centralized lubrication may remove this measurement."
       },
       {
        "label": "Planned Test",
        "text": "At approved stop function-test the installed low-oil-level device; do not drain hot lubricating oil unsafely."
       }
      ],
      "pass": "Correct low-level switch function only where reservoir architecture supports it; record N/A otherwise.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.6",
    "title": "Support station 3 - roller oil level",
    "tasks": [
     {
      "id": "SM054A",
      "tag": "LEV-KLN-06",
      "component": "Support roller 5 oil bath low level Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Support roller 5, oil-bath level switch (station 3); verify lubrication architecture."
       },
       {
        "label": "Live Check",
        "text": "Verify level state agrees with measured inventory / local operational condition; flag stale or contradictory switch indications."
       }
      ],
      "pass": "Correct low-level switch function only where reservoir architecture supports it; record N/A otherwise.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM054B",
      "tag": "LEV-KLN-06",
      "component": "Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "First verify the support roller uses a local oil bath / reservoir; centralized lubrication may remove this measurement."
       },
       {
        "label": "Planned Test",
        "text": "At approved stop function-test the installed low-oil-level device; do not drain hot lubricating oil unsafely."
       }
      ],
      "pass": "Correct low-level switch function only where reservoir architecture supports it; record N/A otherwise.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM055A",
      "tag": "LEV-KLN-07",
      "component": "Support roller 6 oil bath low level Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Support roller 6, oil-bath level switch (station 3); verify lubrication architecture."
       },
       {
        "label": "Live Check",
        "text": "Verify level state agrees with measured inventory / local operational condition; flag stale or contradictory switch indications."
       }
      ],
      "pass": "Correct low-level switch function only where reservoir architecture supports it; record N/A otherwise.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM055B",
      "tag": "LEV-KLN-07",
      "component": "Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "First verify the support roller uses a local oil bath / reservoir; centralized lubrication may remove this measurement."
       },
       {
        "label": "Planned Test",
        "text": "At approved stop function-test the installed low-oil-level device; do not drain hot lubricating oil unsafely."
       }
      ],
      "pass": "Correct low-level switch function only where reservoir architecture supports it; record N/A otherwise.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.7",
    "title": "Auxiliary drive and brake instrumentation",
    "tasks": [
     {
      "id": "SM056A",
      "tag": "LIM-KLN-01",
      "component": "Auxiliary drive brake lining wear limit Position, limit and flow switches",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Auxiliary-drive brake wear-limit / brake mechanism."
       },
       {
        "label": "Live Check",
        "text": "Confirm the brake wear-limit state is valid and stable; flag stale or contradictory state."
       }
      ],
      "pass": "Alarm operates at the OEM lining limit; correct PLC / ULTRON mapping.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM056B",
      "tag": "LIM-KLN-01",
      "component": "Position, limit and flow switches",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect the wear-limit switch or indicator, mounting, cable and gland at the brake."
       },
       {
        "label": "Planned Test",
        "text": "At an isolated stop actuate the wear indicator (or measure the lining against the OEM limit) and confirm the alarm reaches PLC / ULTRON; reset."
       }
      ],
      "pass": "Alarm operates at the OEM lining limit; correct PLC / ULTRON mapping.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM077A",
      "tag": "STS-KLN-11",
      "component": "Auxiliary-drive status Controller status",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Auxiliary turning-drive PLC/controller availability and run feedback."
       },
       {
        "label": "Live Check",
        "text": "Confirm run/ready/fault/valid feedback follows actual equipment and alarm acknowledgements; identify frozen, latched or lost comms."
       }
      ],
      "pass": "Correct state, timing and asset mapping; no forced I/O, unrecorded bypass or unsafe interlock suppression.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM077B",
      "tag": "STS-KLN-11",
      "component": "Controller status",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect PLC channel label, terminal/wiring integrity and alarm event timestamp history at authorized cabinet."
       },
       {
        "label": "Planned Test",
        "text": "Use an approved scripted functional test at a planned stop or standby handover; verify contact polarity, transitions, reset and ULTRON mapping."
       }
      ],
      "pass": "Correct state, timing and asset mapping; no forced I/O, unrecorded bypass or unsafe interlock suppression.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.8",
    "title": "Tyres and online migration references",
    "tasks": [
     {
      "id": "SM057A",
      "tag": "MIG-KLN-01",
      "component": "Tyre 1 slip / migration Tyre migration",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Tyre T1 relative rotation/shell reference pickup."
       },
       {
        "label": "Live Check",
        "text": "Confirm relative shell/tyre movement per revolution at consistent direction and kiln speed; check loss of reference pulses."
       }
      ],
      "pass": "Signed off by kiln OEM against installed tyre geometry; axle/thrust LVDT is NOT a substitute for relative tyre migration.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM057B",
      "tag": "MIG-KLN-01",
      "component": "Tyre migration",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "From protected access inspect fixed pickups/targets, guard integrity, gap and cable routing; do not approach rotating tyre."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop inspect shell and tyre fiducials/targets, alignment and measurement reference; compare to OEM manual migration measurement."
       }
      ],
      "pass": "Signed off by kiln OEM against installed tyre geometry; axle/thrust LVDT is NOT a substitute for relative tyre migration.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM058A",
      "tag": "MIG-KLN-02",
      "component": "Tyre 2 slip / migration Tyre migration",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Tyre T2 relative rotation/shell reference pickup."
       },
       {
        "label": "Live Check",
        "text": "Confirm relative shell/tyre movement per revolution at consistent direction and kiln speed; check loss of reference pulses."
       }
      ],
      "pass": "Signed off by kiln OEM against installed tyre geometry; axle/thrust LVDT is NOT a substitute for relative tyre migration.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM058B",
      "tag": "MIG-KLN-02",
      "component": "Tyre migration",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "From protected access inspect fixed pickups/targets, guard integrity, gap and cable routing; do not approach rotating tyre."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop inspect shell and tyre fiducials/targets, alignment and measurement reference; compare to OEM manual migration measurement."
       }
      ],
      "pass": "Signed off by kiln OEM against installed tyre geometry; axle/thrust LVDT is NOT a substitute for relative tyre migration.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM059A",
      "tag": "MIG-KLN-03",
      "component": "Tyre 3 slip / migration Tyre migration",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Tyre T3 relative rotation/shell reference pickup."
       },
       {
        "label": "Live Check",
        "text": "Confirm relative shell/tyre movement per revolution at consistent direction and kiln speed; check loss of reference pulses."
       }
      ],
      "pass": "Signed off by kiln OEM against installed tyre geometry; axle/thrust LVDT is NOT a substitute for relative tyre migration.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM059B",
      "tag": "MIG-KLN-03",
      "component": "Tyre migration",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "From protected access inspect fixed pickups/targets, guard integrity, gap and cable routing; do not approach rotating tyre."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop inspect shell and tyre fiducials/targets, alignment and measurement reference; compare to OEM manual migration measurement."
       }
      ],
      "pass": "Signed off by kiln OEM against installed tyre geometry; axle/thrust LVDT is NOT a substitute for relative tyre migration.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.9",
    "title": "Hydraulic thrust and kiln axial-motion measurement",
    "tasks": [
     {
      "id": "SM060A",
      "tag": "POS-KLN-01",
      "component": "Kiln axial position Position, limit and flow switches",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln axial position reference / LVDT validated to true kiln translation."
       },
       {
        "label": "Live Check",
        "text": "Trend limit/position/flow state against equipment movement or pressure/load; detect disagreement with command."
       }
      ],
      "pass": "Measurement tracks true kiln shell axial motion; hydraulic cylinder stroke only if OEM establishes a one-to-one relationship.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM060B",
      "tag": "POS-KLN-01",
      "component": "Position, limit and flow switches",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect transmitter, cable/bracket, travel target, gland, actuator linkage and fittings without moving equipment unsafely."
       },
       {
        "label": "Planned Test",
        "text": "With controlled OEM procedure compare indicated axial displacement with an independent shell/tyre axial reference; calibrate LVDT only after verifying physical linkage."
       }
      ],
      "pass": "Measurement tracks true kiln shell axial motion; hydraulic cylinder stroke only if OEM establishes a one-to-one relationship.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM061A",
      "tag": "POS-KLN-02",
      "component": "Thrust travel-limit status Position, limit and flow switches",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Axial/thrust upper and lower permissible travel limit feedback."
       },
       {
        "label": "Live Check",
        "text": "Trend limit/position/flow state against equipment movement or pressure/load; detect disagreement with command."
       }
      ],
      "pass": "Repeatable feedback over allowed motion/flow; correct PLC mapping and no persistent discrepancy.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM061B",
      "tag": "POS-KLN-02",
      "component": "Position, limit and flow switches",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect transmitter, cable/bracket, travel target, gland, actuator linkage and fittings without moving equipment unsafely."
       },
       {
        "label": "Planned Test",
        "text": "After isolation or OEM-safe test stroke confirm transitions at calibrated limits; verify end-to-end DCS alarms/interlocks and reset."
       }
      ],
      "pass": "Repeatable feedback over allowed motion/flow; correct PLC mapping and no persistent discrepancy.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM066A",
      "tag": "PRS-KLN-07",
      "component": "Hydraulic thrust pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Thrust roller hydraulic power-unit working pressure line."
       },
       {
        "label": "Live Check",
        "text": "Review pressure against pump / HPU state, oil temperature and load; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Leak-free connection, correct range and scaling, calibration within plant-approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM066B",
      "tag": "PRS-KLN-07",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check transmitter, root valve, manifold and tubing for leaks; compare with the local gauge where fitted; never loosen pressurised oil fittings."
       },
       {
        "label": "Planned Test",
        "text": "After isolation and depressurising, verify zero / span with a traceable pressure source, restore root and manifold valves and confirm alarm setpoint and DCS scaling."
       }
      ],
      "pass": "Leak-free connection, correct range and scaling, calibration within plant-approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.10",
    "title": "Kiln shell scanner, burning zone and outlet/hood instruments",
    "tasks": [
     {
      "id": "SM063A",
      "tag": "PRS-KLN-03",
      "component": "Kiln hood pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln outlet hood pressure tapping."
       },
       {
        "label": "Live Check",
        "text": "Review pressure/draft/DP against fan speed, valves and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM063B",
      "tag": "PRS-KLN-03",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check purge supply, tap and impulse line integrity, manifolds, leaks, line support and condensate; keep hot/dusty connections closed in service."
       },
       {
        "label": "Planned Test",
        "text": "Only after safe isolation and depressurizing, verify clear tap/impulse path and zero/span using traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM076A",
      "tag": "STS-KLN-08 / CAL-KLN-03",
      "component": "Shell scanner status, temperature map/max Kiln shell scanner",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Stand-off exterior kiln shell linescanner + map server (single online D5 entry)."
       },
       {
        "label": "Live Check",
        "text": "Check shell map freshness, scanner rotation synchronization, hotspot and obscured/invalid zones, and sensor-health status (ONE D5 entry)."
       }
      ],
      "pass": "No missing map, implausible stationary stripes or lost synchronization; accepted comparison; D5 95% coverage target subject to mapped blind areas.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM076B",
      "tag": "STS-KLN-08 / CAL-KLN-03",
      "component": "Kiln shell scanner",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect scanner optics, window air purge, alignment and line-of-sight obstructions from a safe stand- off."
       },
       {
        "label": "Planned Test",
        "text": "Compare selected shell sectors with handheld IR record at agreed emissivity/location; document tyre and girth blind areas."
       }
      ],
      "pass": "No missing map, implausible stationary stripes or lost synchronization; accepted comparison; D5 95% coverage target subject to mapped blind areas.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM091A",
      "tag": "TMP-KLN-14",
      "component": "Burning-zone temperature / optical proxy IR / optical temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Protected hood optical port with line of sight into burning zone."
       },
       {
        "label": "Live Check",
        "text": "Trend measured optical temperature against nearby process state and image/signal-quality diagnostics; identify implausible jumps."
       }
      ],
      "pass": "Optical temperature indication has validated target and emissivity; do not infer true flame temperature from an uncalibrated proxy.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM091B",
      "tag": "TMP-KLN-14",
      "component": "IR / optical temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect protected hood optical port, viewing angle and purge; sensor measures burning-zone radiance, not external shell temperature."
       },
       {
        "label": "Planned Test",
        "text": "At safe access compare with a reference target/pyrometer where suitable; verify emissivity, range, calibration and optic aim per OEM."
       }
      ],
      "pass": "Optical temperature indication has validated target and emissivity; do not infer true flame temperature from an uncalibrated proxy.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM098A",
      "tag": "TMP-KLN-25",
      "component": "Outlet sector-plate cooling supply temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln outlet sector-plate cooling-air supply duct RTD."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM098B",
      "tag": "TMP-KLN-25",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM099A",
      "tag": "TMP-KLN-26",
      "component": "Outlet cooling shroud (cow shell) surface temperature IR / optical temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln outlet cooling shroud outer surface optical sensing point."
       },
       {
        "label": "Live Check",
        "text": "Trend measured optical temperature against nearby process state and image/signal-quality diagnostics; identify implausible jumps."
       }
      ],
      "pass": "Reference check on shroud surface; not confused with hood gas or refractory temperature.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM099B",
      "tag": "TMP-KLN-26",
      "component": "IR / optical temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check sightline specifically to the OUTLET cooling shroud surface; confirm stand-off, hot dust and cooling air."
       },
       {
        "label": "Planned Test",
        "text": "At safe access compare with a reference target/pyrometer where suitable; verify emissivity, range, calibration and optic aim per OEM."
       }
      ],
      "pass": "Reference check on shroud surface; not confused with hood gas or refractory temperature.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM100A",
      "tag": "TMP-KLN-27",
      "component": "Kiln hood gas / structural temperature Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln outlet hood gas/structure point: exact medium unresolved."
       },
       {
        "label": "Live Check",
        "text": "Review stage/process temperature trend, open-circuit alarms, spikes and step changes relative to other stages and operating mode."
       }
      ],
      "pass": "Physical quantity and probe construction are documented; mark validation pending until resolved.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM100B",
      "tag": "TMP-KLN-27",
      "component": "Thermocouple",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify cable protection, extension-wire polarity, junction-head seal and measuring-point condition from approved access."
       },
       {
        "label": "Planned Test",
        "text": "Before any probe service, resolve D5 open item: gas thermocouple or structural sensor; adopt correct OEM calibration after identification."
       }
      ],
      "pass": "Physical quantity and probe construction are documented; mark validation pending until resolved.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.11",
    "title": "Girth-gear spray metering and controller feedback",
    "tasks": [
     {
      "id": "SM067A",
      "tag": "PRX-KLN-01",
      "component": "Spray circuit branch/nozzle check #1 Spray delivery feedback",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Open-gear spray metering bank branch 1, not the gear-tooth impact point."
       },
       {
        "label": "Live Check",
        "text": "Confirm metering detector pulse/cycle for THIS branch during commanded spray cycles; alarm on missing/stuck pulses."
       }
      ],
      "pass": "Pulse count equals commanded metering events; evidence of delivery verified independently - detector motion alone is NOT proof of spray deposition.",
      "freq": "AUTO / W",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM067B",
      "tag": "PRX-KLN-01",
      "component": "Spray delivery feedback",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect metering block proximity sensor, junction, cable, pump cycles and blocked/seized distributor indications."
       },
       {
        "label": "Planned Test",
        "text": "At isolated service functional-test each approved distributor branch and visually verify nozzle delivery/gear coverage under OEM-safe procedure."
       }
      ],
      "pass": "Pulse count equals commanded metering events; evidence of delivery verified independently - detector motion alone is NOT proof of spray deposition.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM068A",
      "tag": "PRX-KLN-02",
      "component": "Spray circuit branch/nozzle check #2 Spray delivery feedback",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Open-gear spray metering bank branch 2, not the gear-tooth impact point."
       },
       {
        "label": "Live Check",
        "text": "Confirm metering detector pulse/cycle for THIS branch during commanded spray cycles; alarm on missing/stuck pulses."
       }
      ],
      "pass": "Pulse count equals commanded metering events; evidence of delivery verified independently - detector motion alone is NOT proof of spray deposition.",
      "freq": "AUTO / W",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM068B",
      "tag": "PRX-KLN-02",
      "component": "Spray delivery feedback",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect metering block proximity sensor, junction, cable, pump cycles and blocked/seized distributor indications."
       },
       {
        "label": "Planned Test",
        "text": "At isolated service functional-test each approved distributor branch and visually verify nozzle delivery/gear coverage under OEM-safe procedure."
       }
      ],
      "pass": "Pulse count equals commanded metering events; evidence of delivery verified independently - detector motion alone is NOT proof of spray deposition.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM069A",
      "tag": "PRX-KLN-03",
      "component": "Spray circuit branch/nozzle check #3 Spray delivery feedback",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Open-gear spray metering bank branch 3, not the gear-tooth impact point."
       },
       {
        "label": "Live Check",
        "text": "Confirm metering detector pulse/cycle for THIS branch during commanded spray cycles; alarm on missing/stuck pulses."
       }
      ],
      "pass": "Pulse count equals commanded metering events; evidence of delivery verified independently - detector motion alone is NOT proof of spray deposition.",
      "freq": "AUTO / W",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM069B",
      "tag": "PRX-KLN-03",
      "component": "Spray delivery feedback",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect metering block proximity sensor, junction, cable, pump cycles and blocked/seized distributor indications."
       },
       {
        "label": "Planned Test",
        "text": "At isolated service functional-test each approved distributor branch and visually verify nozzle delivery/gear coverage under OEM-safe procedure."
       }
      ],
      "pass": "Pulse count equals commanded metering events; evidence of delivery verified independently - detector motion alone is NOT proof of spray deposition.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM070A",
      "tag": "PRX-KLN-04",
      "component": "Spray circuit branch/nozzle check #4 Spray delivery feedback",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Open-gear spray metering bank branch 4, not the gear-tooth impact point."
       },
       {
        "label": "Live Check",
        "text": "Confirm metering detector pulse/cycle for THIS branch during commanded spray cycles; alarm on missing/stuck pulses."
       }
      ],
      "pass": "Pulse count equals commanded metering events; evidence of delivery verified independently - detector motion alone is NOT proof of spray deposition.",
      "freq": "AUTO / W",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM070B",
      "tag": "PRX-KLN-04",
      "component": "Spray delivery feedback",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect metering block proximity sensor, junction, cable, pump cycles and blocked/seized distributor indications."
       },
       {
        "label": "Planned Test",
        "text": "At isolated service functional-test each approved distributor branch and visually verify nozzle delivery/gear coverage under OEM-safe procedure."
       }
      ],
      "pass": "Pulse count equals commanded metering events; evidence of delivery verified independently - detector motion alone is NOT proof of spray deposition.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM071A",
      "tag": "PRX-KLN-05",
      "component": "Spray circuit branch/nozzle check #5 Spray delivery feedback",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Open-gear spray metering bank branch 5, not the gear-tooth impact point."
       },
       {
        "label": "Live Check",
        "text": "Confirm metering detector pulse/cycle for THIS branch during commanded spray cycles; alarm on missing/stuck pulses."
       }
      ],
      "pass": "Pulse count equals commanded metering events; evidence of delivery verified independently - detector motion alone is NOT proof of spray deposition.",
      "freq": "AUTO / W",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM071B",
      "tag": "PRX-KLN-05",
      "component": "Spray delivery feedback",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect metering block proximity sensor, junction, cable, pump cycles and blocked/seized distributor indications."
       },
       {
        "label": "Planned Test",
        "text": "At isolated service functional-test each approved distributor branch and visually verify nozzle delivery/gear coverage under OEM-safe procedure."
       }
      ],
      "pass": "Pulse count equals commanded metering events; evidence of delivery verified independently - detector motion alone is NOT proof of spray deposition.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM072A",
      "tag": "PRX-KLN-06",
      "component": "Spray circuit branch/nozzle check #6 Spray delivery feedback",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Open-gear spray metering bank branch 6, not the gear-tooth impact point."
       },
       {
        "label": "Live Check",
        "text": "Confirm metering detector pulse/cycle for THIS branch during commanded spray cycles; alarm on missing/stuck pulses."
       }
      ],
      "pass": "Pulse count equals commanded metering events; evidence of delivery verified independently - detector motion alone is NOT proof of spray deposition.",
      "freq": "AUTO / W",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM072B",
      "tag": "PRX-KLN-06",
      "component": "Spray delivery feedback",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect metering block proximity sensor, junction, cable, pump cycles and blocked/seized distributor indications."
       },
       {
        "label": "Planned Test",
        "text": "At isolated service functional-test each approved distributor branch and visually verify nozzle delivery/gear coverage under OEM-safe procedure."
       }
      ],
      "pass": "Pulse count equals commanded metering events; evidence of delivery verified independently - detector motion alone is NOT proof of spray deposition.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM074A",
      "tag": "STS-KLN-05",
      "component": "Girth-gear spray controller status/fault Controller status",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Open-gear spray-unit PLC/controller status and fault outputs."
       },
       {
        "label": "Live Check",
        "text": "Confirm run/ready/fault/valid feedback follows actual equipment and alarm acknowledgements; identify frozen, latched or lost comms."
       }
      ],
      "pass": "Correct state, timing and asset mapping; no forced I/O, unrecorded bypass or unsafe interlock suppression.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM074B",
      "tag": "STS-KLN-05",
      "component": "Controller status",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect PLC channel label, terminal/wiring integrity and alarm event timestamp history at authorized cabinet."
       },
       {
        "label": "Planned Test",
        "text": "Use an approved scripted functional test at a planned stop or standby handover; verify contact polarity, transitions, reset and ULTRON mapping."
       }
      ],
      "pass": "Correct state, timing and asset mapping; no forced I/O, unrecorded bypass or unsafe interlock suppression.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.12",
    "title": "Support station 1 - roller-bearing temperature",
    "tasks": [
     {
      "id": "SM078A",
      "tag": "TMP-KLN-01",
      "component": "Station 1 left bearing A temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln support station 1, left roller bearing A stationary housing."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM078B",
      "tag": "TMP-KLN-01",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM079A",
      "tag": "TMP-KLN-02",
      "component": "Station 1 left bearing B temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln support station 1, left roller bearing B stationary housing."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM079B",
      "tag": "TMP-KLN-02",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM080A",
      "tag": "TMP-KLN-03",
      "component": "Station 1 right bearing A temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln support station 1, right roller bearing A stationary housing."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM080B",
      "tag": "TMP-KLN-03",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM081A",
      "tag": "TMP-KLN-04",
      "component": "Station 1 right bearing B temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln support station 1, right roller bearing B stationary housing."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM081B",
      "tag": "TMP-KLN-04",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.13",
    "title": "Support station 2 - roller-bearing temperature",
    "tasks": [
     {
      "id": "SM082A",
      "tag": "TMP-KLN-05",
      "component": "Station 2 left bearing A temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln support station 2, left roller bearing A stationary housing."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM082B",
      "tag": "TMP-KLN-05",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM083A",
      "tag": "TMP-KLN-06",
      "component": "Station 2 left bearing B temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln support station 2, left roller bearing B stationary housing."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM083B",
      "tag": "TMP-KLN-06",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM084A",
      "tag": "TMP-KLN-07",
      "component": "Station 2 right bearing A temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln support station 2, right roller bearing A stationary housing."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM084B",
      "tag": "TMP-KLN-07",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM085A",
      "tag": "TMP-KLN-08",
      "component": "Station 2 right bearing B temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln support station 2, right roller bearing B stationary housing."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM085B",
      "tag": "TMP-KLN-08",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "5.14",
    "title": "Support station 3 - roller-bearing temperature",
    "tasks": [
     {
      "id": "SM086A",
      "tag": "TMP-KLN-09",
      "component": "Station 3 left bearing A temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln support station 3, left roller bearing A stationary housing."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM086B",
      "tag": "TMP-KLN-09",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM087A",
      "tag": "TMP-KLN-10",
      "component": "Station 3 left bearing B temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln support station 3, left roller bearing B stationary housing."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM087B",
      "tag": "TMP-KLN-10",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM088A",
      "tag": "TMP-KLN-11",
      "component": "Station 3 right bearing A temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln support station 3, right roller bearing A stationary housing."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM088B",
      "tag": "TMP-KLN-11",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM089A",
      "tag": "TMP-KLN-12",
      "component": "Station 3 right bearing B temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln support station 3, right roller bearing B stationary housing."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM089B",
      "tag": "TMP-KLN-12",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 },
 {
  "code": "BRN-01",
  "title": "Main burner and fine-coal system",
  "groups": [
   {
    "num": "6.1",
    "title": "Main burner flame optics and combustion-air pressure",
    "tasks": [
     {
      "id": "SM105A",
      "tag": "CAM-BRN-01",
      "component": "Flame-view camera / picture Flame camera",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Protected kiln outlet hood flame-view camera port."
       },
       {
        "label": "Live Check",
        "text": "Confirm live, timestamped image and purge/illumination health during firing; identify frozen/blank frame."
       }
      ],
      "pass": "Stable usable view without false frozen image; correct camera source and approved purge/cooling.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM105B",
      "tag": "CAM-BRN-01",
      "component": "Flame camera",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check camera cooling, viewing window, air purge, mounting and cable/stream diagnostics from protected access."
       },
       {
        "label": "Planned Test",
        "text": "At safe cooled outage clean/inspect optical window; test video-to-ULTRON link, camera alarms and protective housing."
       }
      ],
      "pass": "Stable usable view without false frozen image; correct camera source and approved purge/cooling.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM111A",
      "tag": "PRS-BRN-01",
      "component": "Swirl (helical) air pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Multi-channel burner swirl/helical air branch pressure tap."
       },
       {
        "label": "Live Check",
        "text": "Review pressure against blower / fan state, damper or valve position and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear measurement path, correct H/L orientation and calibration within plant-approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM111B",
      "tag": "PRS-BRN-01",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check tap, root valve, tubing and manifold for leaks; drain condensate from low points; keep the tap clear of dust."
       },
       {
        "label": "Planned Test",
        "text": "After isolation, verify a clear tap path and zero / span with a traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear measurement path, correct H/L orientation and calibration within plant-approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM112A",
      "tag": "PRS-BRN-02",
      "component": "Jet (axial) air pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Multi-channel burner axial/jet air branch pressure tap."
       },
       {
        "label": "Live Check",
        "text": "Review pressure against blower / fan state, damper or valve position and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear measurement path, correct H/L orientation and calibration within plant-approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM112B",
      "tag": "PRS-BRN-02",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check tap, root valve, tubing and manifold for leaks; drain condensate from low points; keep the tap clear of dust."
       },
       {
        "label": "Planned Test",
        "text": "After isolation, verify a clear tap path and zero / span with a traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear measurement path, correct H/L orientation and calibration within plant-approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM113A",
      "tag": "PRS-BRN-03",
      "component": "Primary air header pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Common primary-air header pressure tap."
       },
       {
        "label": "Live Check",
        "text": "Review pressure against blower / fan state, damper or valve position and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear measurement path, correct H/L orientation and calibration within plant-approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM113B",
      "tag": "PRS-BRN-03",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check tap, root valve, tubing and manifold for leaks; drain condensate from low points; keep the tap clear of dust."
       },
       {
        "label": "Planned Test",
        "text": "After isolation, verify a clear tap path and zero / span with a traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear measurement path, correct H/L orientation and calibration within plant-approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "6.2",
    "title": "Primary-air and coal transport blower condition signals",
    "tasks": [
     {
      "id": "SM106A",
      "tag": "ELE-BRN-01",
      "component": "Primary-air fan motor current MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Primary-air fan motor MCC/VFD feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM106B",
      "tag": "ELE-BRN-01",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM107A",
      "tag": "ELE-BRN-02",
      "component": "Coal transport blower current MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Coal conveying blower motor MCC/VFD feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM107B",
      "tag": "ELE-BRN-02",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM115A",
      "tag": "TMP-BRN-01",
      "component": "Primary-air fan bearing temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Primary-air fan bearing embedded/strap RTD."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM115B",
      "tag": "TMP-BRN-01",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM118A",
      "tag": "VIB-BRN-01",
      "component": "Primary-air fan vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Primary-air fan stationary bearing housing."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM118B",
      "tag": "VIB-BRN-01",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM119A",
      "tag": "VIB-BRN-02",
      "component": "Coal transport blower vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Coal conveying blower stationary bearing housing."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM119B",
      "tag": "VIB-BRN-02",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "6.3",
    "title": "Coal weighfeeder and conveying-line monitoring",
    "tasks": [
     {
      "id": "SM108A",
      "tag": "FLO-BRN-01",
      "component": "Kiln coal mass flow Solid-flow meter",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Kiln fine-coal weighfeeder / verified fuel mass-flow measurement."
       },
       {
        "label": "Live Check",
        "text": "Compare flow t/h with feed setpoint, inventory mass balance and feeder state; watch drift, noisy or flat data."
       }
      ],
      "pass": "Reliable mass flow from the actual kiln feeder - not a separately assumed calciner circuit.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM108B",
      "tag": "FLO-BRN-01",
      "component": "Solid-flow meter",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify exact kiln coal weighfeeder and fuel line ID; check weighing electronics, isolation and coal-dust housekeeping."
       },
       {
        "label": "Planned Test",
        "text": "Use the feed-system OEM calibration method / test weights and compare with verified fuel usage; any access follows combustible-dust controls."
       }
      ],
      "pass": "Reliable mass flow from the actual kiln feeder - not a separately assumed calciner circuit.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM114A",
      "tag": "PRS-BRN-04",
      "component": "Coal transport line pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Fine-coal pneumatic conveying air/fuel line pressure tap."
       },
       {
        "label": "Live Check",
        "text": "Review pressure against blower / fan state, damper or valve position and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear measurement path, correct H/L orientation and calibration within plant-approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM114B",
      "tag": "PRS-BRN-04",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check tap, root valve, tubing and manifold for leaks; drain condensate from low points; keep the tap clear of dust."
       },
       {
        "label": "Planned Test",
        "text": "After isolation, verify a clear tap path and zero / span with a traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear measurement path, correct H/L orientation and calibration within plant-approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM116A",
      "tag": "TMP-BRN-02",
      "component": "Secondary air temperature Thermocouple",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Secondary-air entry duct near kiln outlet hood."
       },
       {
        "label": "Live Check",
        "text": "Review stage/process temperature trend, open-circuit alarms, spikes and step changes relative to other stages and operating mode."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM116B",
      "tag": "TMP-BRN-02",
      "component": "Thermocouple",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify cable protection, extension-wire polarity, junction-head seal and measuring-point condition from approved access."
       },
       {
        "label": "Planned Test",
        "text": "At cooled, isolated shutdown inspect sheath/thermowell for erosion and replace if damaged; simulate input at transmitter, verify cold-junction compensation and verify DCS scaling."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "6.4",
    "title": "Fine-coal bin level, gas and thermal instrumentation",
    "tasks": [
     {
      "id": "SM109A",
      "tag": "GAS-BRN-01",
      "component": "Fine-coal bin CO / CO indication 2 Gas analyser channel",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Fine-coal bin sample analyser / approved sample path (CO basis subject to EHS)."
       },
       {
        "label": "Live Check",
        "text": "Monitor valid fine-coal bin headspace gas channel and sample-system health; treat alarms as coal-fire hazard per plant EHS plan."
       }
      ],
      "pass": "Approved species, sample line and safety function documented; CO is NOT assumed 2 an equivalent CO early-fire measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM109B",
      "tag": "GAS-BRN-01",
      "component": "Gas analyser channel",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check protected sample filters, condensate handling and approved analyzer service points; do not open a bin/sample path without hazardous- area permit."
       },
       {
        "label": "Planned Test",
        "text": "EHS to confirm CO target and alarm philosophy; use certified calibration gas and prescribed functional tests only by competent personnel."
       }
      ],
      "pass": "Approved species, sample line and safety function documented; CO is NOT assumed 2 an equivalent CO early-fire measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM110A",
      "tag": "LEV-BRN-01",
      "component": "Fine-coal bin level Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Fine-coal storage/feeder bin roof level transmitter."
       },
       {
        "label": "Live Check",
        "text": "Check echo/level-quality alarms, plausible fill/empty direction and comparison against material throughput or independent level."
       }
      ],
      "pass": "Healthy echo/diagnostic quality; correct direction and alarm test; no build-up preventing reliable measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM110B",
      "tag": "LEV-BRN-01",
      "component": "Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect mounting nozzle, flange seal and antenna window for dust or coating; clean ONLY when condition indicates and OEM permits."
       },
       {
        "label": "Planned Test",
        "text": "At safe vessel isolation verify empty/reference distance and configured blocking distance; verify alarm outputs and DCS scaling."
       }
      ],
      "pass": "Healthy echo/diagnostic quality; correct direction and alarm test; no build-up preventing reliable measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM117A",
      "tag": "TMP-BRN-04",
      "component": "Fine-coal bin temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Fine-coal bin temperature point at OEM/safety-approved depth."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM117B",
      "tag": "TMP-BRN-04",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM162",
      "tag": "COAL-AREA EX EQUIPMENT",
      "component": "Instruments, junction boxes and DAQ-3 node in the coal area",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Close Ex inspection of TMP-BRN-04, GAS-BRN-01, LEV-BRN-01, FLO-BRN-01, VIB-BRN-02 and DAQ-3: marking vs zone, enclosure, glands, earthing and dust deposits."
       },
       {
        "label": "Planned Test",
        "text": "Detailed inspection per IEC 60079-17 schedule by competent person; record defects and close before energising."
       }
      ],
      "pass": "Equipment Ex category suits the zone; enclosures, glands and earthing intact; no dust layer above the permitted thickness.",
      "freq": "SITE / OEM",
      "owner": "EL",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 },
 {
  "code": "CLR-01",
  "title": "Clinker cooler, fans and grate drive",
  "groups": [
   {
    "num": "7.1",
    "title": "Cooler fan 1 drive/bearing sensing",
    "tasks": [
     {
      "id": "SM120A",
      "tag": "ELE-CLR-01",
      "component": "Cooling fan 1 motor current MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooling fan 1 motor MCC/VFD feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM120B",
      "tag": "ELE-CLR-01",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM145A",
      "tag": "VIB-CLR-01",
      "component": "Cooling fan 1 vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooling fan 1 stationary bearing housing."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM145B",
      "tag": "VIB-CLR-01",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.2",
    "title": "Cooler fan 2 drive/bearing sensing",
    "tasks": [
     {
      "id": "SM121A",
      "tag": "ELE-CLR-02",
      "component": "Cooling fan 2 motor current MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooling fan 2 motor MCC/VFD feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM121B",
      "tag": "ELE-CLR-02",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM146A",
      "tag": "VIB-CLR-02",
      "component": "Cooling fan 2 vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooling fan 2 stationary bearing housing."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM146B",
      "tag": "VIB-CLR-02",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.3",
    "title": "Cooler fan 3 drive/bearing sensing",
    "tasks": [
     {
      "id": "SM122A",
      "tag": "ELE-CLR-03",
      "component": "Cooling fan 3 motor current MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooling fan 3 motor MCC/VFD feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM122B",
      "tag": "ELE-CLR-03",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM147A",
      "tag": "VIB-CLR-03",
      "component": "Cooling fan 3 vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooling fan 3 stationary bearing housing."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM147B",
      "tag": "VIB-CLR-03",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.4",
    "title": "Cooler fan 4 drive/bearing sensing",
    "tasks": [
     {
      "id": "SM123A",
      "tag": "ELE-CLR-04",
      "component": "Cooling fan 4 motor current MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooling fan 4 motor MCC/VFD feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM123B",
      "tag": "ELE-CLR-04",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.5",
    "title": "Cooler fan 5 drive/bearing sensing",
    "tasks": [
     {
      "id": "SM124A",
      "tag": "ELE-CLR-05",
      "component": "Cooling fan 5 motor current MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooling fan 5 motor MCC/VFD feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM124B",
      "tag": "ELE-CLR-05",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.6",
    "title": "Cooler fan 6 drive/bearing sensing",
    "tasks": [
     {
      "id": "SM125A",
      "tag": "ELE-CLR-06",
      "component": "Cooling fan 6 motor current MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooling fan 6 motor MCC/VFD feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM125B",
      "tag": "ELE-CLR-06",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.7",
    "title": "Hot clinker discharge, exhaust and vent fan sensors",
    "tasks": [
     {
      "id": "SM126A",
      "tag": "ELE-CLR-07",
      "component": "Vent fan electrical current MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooler exhaust/vent fan motor MCC / VFD feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM126B",
      "tag": "ELE-CLR-07",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM142A",
      "tag": "TMP-CLR-08",
      "component": "Discharge clinker surface temperature IR / optical temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Protected IR sightline on clinker at cooler discharge."
       },
       {
        "label": "Live Check",
        "text": "Trend measured optical temperature against nearby process state and image/signal-quality diagnostics; identify implausible jumps."
       }
      ],
      "pass": "Hot-clinker surface trend plausible after cooler load change; compare against approved portable reference.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM142B",
      "tag": "TMP-CLR-08",
      "component": "IR / optical temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check discharge IR pyrometer protected view specifically at clinker surface, not gas; inspect window purge and dust deposits."
       },
       {
        "label": "Planned Test",
        "text": "At safe access compare with a reference target/pyrometer where suitable; verify emissivity, range, calibration and optic aim per OEM."
       }
      ],
      "pass": "Hot-clinker surface trend plausible after cooler load change; compare against approved portable reference.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM143A",
      "tag": "TMP-CLR-09",
      "component": "Cooler exhaust gas temperature Thermocouple",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Cooler vent/exhaust duct gas-temperature tap."
       },
       {
        "label": "Live Check",
        "text": "Review stage/process temperature trend, open-circuit alarms, spikes and step changes relative to other stages and operating mode."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM143B",
      "tag": "TMP-CLR-09",
      "component": "Thermocouple",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Verify cable protection, extension-wire polarity, junction-head seal and measuring-point condition from approved access."
       },
       {
        "label": "Planned Test",
        "text": "At cooled, isolated shutdown inspect sheath/thermowell for erosion and replace if damaged; simulate input at transmitter, verify cold-junction compensation and verify DCS scaling."
       }
      ],
      "pass": "No unapproved bypass or open circuit; response agrees with certified reference / nearby validated process measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM144A",
      "tag": "TMP-CLR-10",
      "component": "Vent fan bearing temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooler exhaust/vent fan bearing housing RTD."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM144B",
      "tag": "TMP-CLR-10",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM148A",
      "tag": "VIB-CLR-07",
      "component": "Cooler vent fan vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooler vent fan stationary bearing housing."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM148B",
      "tag": "VIB-CLR-07",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.8",
    "title": "Cooler under-grate chamber 1 pressure instrument",
    "tasks": [
     {
      "id": "SM127A",
      "tag": "PRS-CLR-01",
      "component": "Under-grate chamber 1 static pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooler under-grate chamber 1 static-pressure tapping (dust purged)."
       },
       {
        "label": "Live Check",
        "text": "Review pressure/draft/DP against fan speed, valves and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM127B",
      "tag": "PRS-CLR-01",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check purge supply, tap and impulse line integrity, manifolds, leaks, line support and condensate; keep hot/dusty connections closed in service."
       },
       {
        "label": "Planned Test",
        "text": "Only after safe isolation and depressurizing, verify clear tap/impulse path and zero/span using traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.9",
    "title": "Cooler under-grate chamber 2 pressure instrument",
    "tasks": [
     {
      "id": "SM128A",
      "tag": "PRS-CLR-02",
      "component": "Under-grate chamber 2 static pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooler under-grate chamber 2 static-pressure tapping (dust purged)."
       },
       {
        "label": "Live Check",
        "text": "Review pressure/draft/DP against fan speed, valves and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM128B",
      "tag": "PRS-CLR-02",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check purge supply, tap and impulse line integrity, manifolds, leaks, line support and condensate; keep hot/dusty connections closed in service."
       },
       {
        "label": "Planned Test",
        "text": "Only after safe isolation and depressurizing, verify clear tap/impulse path and zero/span using traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.10",
    "title": "Cooler under-grate chamber 3 pressure instrument",
    "tasks": [
     {
      "id": "SM129A",
      "tag": "PRS-CLR-03",
      "component": "Under-grate chamber 3 static pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooler under-grate chamber 3 static-pressure tapping (dust purged)."
       },
       {
        "label": "Live Check",
        "text": "Review pressure/draft/DP against fan speed, valves and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM129B",
      "tag": "PRS-CLR-03",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check purge supply, tap and impulse line integrity, manifolds, leaks, line support and condensate; keep hot/dusty connections closed in service."
       },
       {
        "label": "Planned Test",
        "text": "Only after safe isolation and depressurizing, verify clear tap/impulse path and zero/span using traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.11",
    "title": "Cooler under-grate chamber 4 pressure instrument",
    "tasks": [
     {
      "id": "SM130A",
      "tag": "PRS-CLR-04",
      "component": "Under-grate chamber 4 static pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooler under-grate chamber 4 static-pressure tapping (dust purged)."
       },
       {
        "label": "Live Check",
        "text": "Review pressure/draft/DP against fan speed, valves and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM130B",
      "tag": "PRS-CLR-04",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check purge supply, tap and impulse line integrity, manifolds, leaks, line support and condensate; keep hot/dusty connections closed in service."
       },
       {
        "label": "Planned Test",
        "text": "Only after safe isolation and depressurizing, verify clear tap/impulse path and zero/span using traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.12",
    "title": "Cooler under-grate chamber 5 pressure instrument",
    "tasks": [
     {
      "id": "SM131A",
      "tag": "PRS-CLR-05",
      "component": "Under-grate chamber 5 static pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooler under-grate chamber 5 static-pressure tapping (dust purged)."
       },
       {
        "label": "Live Check",
        "text": "Review pressure/draft/DP against fan speed, valves and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM131B",
      "tag": "PRS-CLR-05",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check purge supply, tap and impulse line integrity, manifolds, leaks, line support and condensate; keep hot/dusty connections closed in service."
       },
       {
        "label": "Planned Test",
        "text": "Only after safe isolation and depressurizing, verify clear tap/impulse path and zero/span using traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.13",
    "title": "Cooler under-grate chamber 6 pressure instrument",
    "tasks": [
     {
      "id": "SM132A",
      "tag": "PRS-CLR-06",
      "component": "Under-grate chamber 6 static pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooler under-grate chamber 6 static-pressure tapping (dust purged)."
       },
       {
        "label": "Live Check",
        "text": "Review pressure/draft/DP against fan speed, valves and process demand; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM132B",
      "tag": "PRS-CLR-06",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check purge supply, tap and impulse line integrity, manifolds, leaks, line support and condensate; keep hot/dusty connections closed in service."
       },
       {
        "label": "Planned Test",
        "text": "Only after safe isolation and depressurizing, verify clear tap/impulse path and zero/span using traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Clear protected measurement path, correct H/L orientation, healthy purge and calibration within plant- approved tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.14",
    "title": "Grate hydraulic unit and stroke feedback",
    "tasks": [
     {
      "id": "SM133A",
      "tag": "PRS-CLR-07",
      "component": "Grate hydraulic working pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooler grate hydraulic working-pressure header at power unit."
       },
       {
        "label": "Live Check",
        "text": "Review pressure against pump / HPU state, oil temperature and load; check dead, saturated or implausible changes."
       }
      ],
      "pass": "Pressure trend corresponds to grate stroke and relief/drive state within hydraulic OEM limits.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM133B",
      "tag": "PRS-CLR-07",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check hydraulic header for leaks, transmitter port security and impulse leakage; do not loosen live hydraulic fittings."
       },
       {
        "label": "Planned Test",
        "text": "Only after safe isolation and depressurizing, verify clear tap/impulse path and zero/span using traceable pressure source; restore valves correctly."
       }
      ],
      "pass": "Pressure trend corresponds to grate stroke and relief/drive state within hydraulic OEM limits.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM134A",
      "tag": "SPD-CLR-01",
      "component": "Grate stroke or transport cycle rate Speed / zero-speed",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Grate transport stroke/cycle detector or validated drive feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare stroke rate with the controller set-point and hydraulic pressure cycles; detect missing or frozen strokes."
       }
      ],
      "pass": "Counted stroke rate matches actual grate movement; loss-of-stroke alarm verified.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM134B",
      "tag": "SPD-CLR-01",
      "component": "Speed / zero-speed",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect the stroke / cycle detector (limit switches or cylinder position feedback), bracket, target and cable."
       },
       {
        "label": "Planned Test",
        "text": "With the grate stroking under OEM procedure, compare counted strokes with a timed manual count and the set-point; verify the alarm on loss of stroke."
       }
      ],
      "pass": "Counted stroke rate matches actual grate movement; loss-of-stroke alarm verified.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM141A",
      "tag": "TMP-CLR-07",
      "component": "Grate hydraulic oil temperature RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Grate hydraulic oil tank/return RTD."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM141B",
      "tag": "TMP-CLR-07",
      "component": "RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.15",
    "title": "Cooler fan 1 bearing temperature",
    "tasks": [
     {
      "id": "SM135A",
      "tag": "TMP-CLR-01",
      "component": "Cooling fan 1 bearing temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooling fan 1 bearing temperature measurement."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM135B",
      "tag": "TMP-CLR-01",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.16",
    "title": "Cooler fan 2 bearing temperature",
    "tasks": [
     {
      "id": "SM136A",
      "tag": "TMP-CLR-02",
      "component": "Cooling fan 2 bearing temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooling fan 2 bearing temperature measurement."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM136B",
      "tag": "TMP-CLR-02",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.17",
    "title": "Cooler fan 3 bearing temperature",
    "tasks": [
     {
      "id": "SM137A",
      "tag": "TMP-CLR-03",
      "component": "Cooling fan 3 bearing temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Cooling fan 3 bearing temperature measurement."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM137B",
      "tag": "TMP-CLR-03",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.18",
    "title": "Cooler fan 4 bearing temperature",
    "tasks": [
     {
      "id": "SM138A",
      "tag": "TMP-CLR-04",
      "component": "Cooling fan 4 bearing temperature RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Cooling fan 4 bearing temperature measurement."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM138B",
      "tag": "TMP-CLR-04",
      "component": "RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.19",
    "title": "Cooler fan 5 bearing temperature",
    "tasks": [
     {
      "id": "SM139A",
      "tag": "TMP-CLR-05",
      "component": "Cooling fan 5 bearing temperature RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Cooling fan 5 bearing temperature measurement."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM139B",
      "tag": "TMP-CLR-05",
      "component": "RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "7.20",
    "title": "Cooler fan 6 bearing temperature",
    "tasks": [
     {
      "id": "SM140A",
      "tag": "TMP-CLR-06",
      "component": "Cooling fan 6 bearing temperature RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Cooling fan 6 bearing temperature measurement."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM140B",
      "tag": "TMP-CLR-06",
      "component": "RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 },
 {
  "code": "HMR-01",
  "title": "Clinker hammer crusher",
  "groups": [
   {
    "num": "8.1",
    "title": "Hammer crusher rotor, drive, bearings and actual shaft-speed sensing",
    "tasks": [
     {
      "id": "SM149A",
      "tag": "ELE-HMR-01",
      "component": "Crusher motor current MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Hammer-crusher drive motor MCC/VFD electrical feedback."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM149B",
      "tag": "ELE-HMR-01",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM150A",
      "tag": "SPD-HMR-01",
      "component": "Crusher shaft speed Speed / zero-speed",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Crusher driven rotor shaft pickup, not motor rpm."
       },
       {
        "label": "Live Check",
        "text": "Compare actual driven-element speed with process/command and shaft-motion plausibility; watch dropouts, underspeed and frozen feedback."
       }
      ],
      "pass": "Reliable pulses over operating range; correct shaft identity/direction/scaling; protective action checked with permits.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM150B",
      "tag": "SPD-HMR-01",
      "component": "Speed / zero-speed",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect noncontact pickup gap, target bolts/teeth, bracket stiffness, cable wear and metal buildup from safe position."
       },
       {
        "label": "Planned Test",
        "text": "With approved safe test verify pickup pulses and alarm setpoint using OEM test device/reference tachometer; test zero speed without bypassing protection."
       }
      ],
      "pass": "Reliable pulses over operating range; correct shaft identity/direction/scaling; protective action checked with permits.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM151A",
      "tag": "TMP-HMR-01",
      "component": "Crusher DE bearing temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Crusher rotor DE bearing housing RTD."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM151B",
      "tag": "TMP-HMR-01",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM152A",
      "tag": "TMP-HMR-02",
      "component": "Crusher NDE bearing temperature RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Crusher rotor NDE bearing housing RTD."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM152B",
      "tag": "TMP-HMR-02",
      "component": "RTD temperature",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM153A",
      "tag": "TMP-HMR-03",
      "component": "Crusher motor winding temperature RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Location",
        "text": "Crusher motor winding RTD if installed."
       },
       {
        "label": "Live Check",
        "text": "Check plausible value and rate of change against load, ambient and adjacent bearings; investigate open/short/frozen reading."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM153B",
      "tag": "TMP-HMR-03",
      "component": "RTD temperature",
      "priority": "Optional",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect head, RTD terminal seals, conduit and cable joints; cross-check with local reference only where safe."
       },
       {
        "label": "Planned Test",
        "text": "At planned isolation perform end-to-end resistance/transmitter simulator check and compare documented reference; inspect thermowell/insertion only if fitted."
       }
      ],
      "pass": "Valid loop, sound termination and reading consistent with reference within approved instrument/OEM tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM154A",
      "tag": "VIB-HMR-01",
      "component": "Clinker crusher rotor DE vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Crusher rotor DE stationary bearing housing."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM154B",
      "tag": "VIB-HMR-01",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM155A",
      "tag": "VIB-HMR-02",
      "component": "Clinker crusher rotor NDE vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Crusher rotor NDE stationary bearing housing."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM155B",
      "tag": "VIB-HMR-02",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 },
 {
  "code": "CSL-01",
  "title": "Clinker transport and silo",
  "groups": [
   {
    "num": "9.1",
    "title": "Clinker pan conveyor drive and speed sensing",
    "tasks": [
     {
      "id": "SM156A",
      "tag": "ELE-CSL-01",
      "component": "Pan conveyor motor current MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Pan conveyor motor MCC/VFD."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM156B",
      "tag": "ELE-CSL-01",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM160A",
      "tag": "SPD-CSL-01",
      "component": "Conveyor chain speed / zero speed Speed / zero-speed",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Pan conveyor return/tail sprocket actual-motion speed pickup."
       },
       {
        "label": "Live Check",
        "text": "Compare actual driven-element speed with process/command and shaft- motion plausibility; watch dropouts, underspeed and frozen feedback."
       }
      ],
      "pass": "Reliable pulses over operating range; correct shaft identity/direction/scaling; protective action checked with permits.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM160B",
      "tag": "SPD-CSL-01",
      "component": "Speed / zero-speed",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect noncontact pickup gap, target bolts/teeth, bracket stiffness, cable wear and metal buildup from safe position."
       },
       {
        "label": "Planned Test",
        "text": "With approved safe test verify pickup pulses and alarm setpoint using OEM test device/reference tachometer; test zero speed without bypassing protection."
       }
      ],
      "pass": "Reliable pulses over operating range; correct shaft identity/direction/scaling; protective action checked with permits.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM161A",
      "tag": "VIB-CSL-01",
      "component": "Pan conveyor drive vibration IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Pan conveyor drive-head stationary bearing/gearbox housing."
       },
       {
        "label": "Live Check",
        "text": "Trend RMS and waveform against the same speed/load baseline; review missing, flat or clipped channel and related bearing temperature."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM161B",
      "tag": "VIB-CSL-01",
      "component": "IEPE accelerometer",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect accessible mount, sensor orientation, shielded lead, cable anchoring, connectors and DAQ health for dust, looseness or damage."
       },
       {
        "label": "Planned Test",
        "text": "At isolated stop verify approved stud/mount torque (sensor-specific OEM), IEPE bias and channel excitation; capture reference spectrum after maintenance; verify sensitivity with a handheld reference shaker (e.g. 1 g at 159.2 Hz) where accessible."
       }
      ],
      "pass": "Secure mounting; no open/short or obvious noise; repeatable spectrum after matched-speed comparison.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "9.2",
    "title": "Clinker silo level, baghouse DP and vent-fan signals",
    "tasks": [
     {
      "id": "SM157A",
      "tag": "ELE-CSL-02",
      "component": "Dust collector fan motor current MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Clinker silo baghouse extraction-fan motor MCC/VFD."
       },
       {
        "label": "Live Check",
        "text": "Compare displayed current/power/drive state with load and adjacent process signals; flag stale values and communications faults."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "DCS DATA"
     },
     {
      "id": "SM157B",
      "tag": "ELE-CSL-02",
      "component": "MCC / VFD electrical data",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "At safe control-cabinet access check engineering units, CT/PT ratio where applicable, drive register address and timestamp quality."
       },
       {
        "label": "Planned Test",
        "text": "During authorized maintenance compare ULTRON/PLC values with VFD/MCC local display and calibrated electrical test reference if required."
       }
      ],
      "pass": "Correct asset identity, sign, units and scaling; no stale/lost data; agrees with validated source within integration tolerance.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM158A",
      "tag": "LEV-CSL-01",
      "component": "Clinker silo continuous level Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Clinker silo roof radar level measurement nozzle."
       },
       {
        "label": "Live Check",
        "text": "Check echo/level-quality alarms, plausible fill/empty direction and comparison against material throughput or independent level."
       }
      ],
      "pass": "Healthy echo/diagnostic quality; correct direction and alarm test; no build-up preventing reliable measurement.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM158B",
      "tag": "LEV-CSL-01",
      "component": "Level radar / switch",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Inspect mounting nozzle, flange seal and antenna window for dust or coating; clean ONLY when condition indicates and OEM permits."
       },
       {
        "label": "Planned Test",
        "text": "At safe vessel isolation verify empty/reference distance and configured blocking distance; verify alarm outputs and DCS scaling."
       }
      ],
      "pass": "Healthy echo/diagnostic quality; correct direction and alarm test; no build-up preventing reliable measurement.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     },
     {
      "id": "SM159A",
      "tag": "PRS-CSL-01",
      "component": "Silo baghouse differential pressure Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Location",
        "text": "Clinker silo vent baghouse dirty and clean plenum DP impulse lines."
       },
       {
        "label": "Live Check",
        "text": "Trend baghouse DP between dirty and clean plenums; compare pulse/cleaning state and vent fan load."
       }
      ],
      "pass": "DP matches airflow/cleaning state; negative or very low DP does not by itself prove filter integrity.",
      "freq": "AUTO / SHIFT",
      "owner": "IN",
      "mode": "RUN",
      "scope": "FIELD"
     },
     {
      "id": "SM159B",
      "tag": "PRS-CSL-01",
      "component": "Pressure / differential pressure",
      "priority": "Required",
      "check": [
       {
        "label": "Field Check",
        "text": "Check BOTH dirty/clean DP tubes, moisture blockage, instrument zero, baghouse hose/port seals."
       },
       {
        "label": "Planned Test",
        "text": "With isolation equalize and check zero/span; compare before/after approved filter maintenance."
       }
      ],
      "pass": "DP matches airflow/cleaning state; negative or very low DP does not by itself prove filter integrity.",
      "freq": "O / OEM",
      "owner": "IN",
      "mode": "OFF",
      "scope": "VERIFY"
     }
    ]
   }
  ]
 },
 {
  "code": "EXH-IF",
  "title": "Main exhaust gas treatment (ESP and bag filter)",
  "groups": [
   {
    "num": "10.1",
    "title": "Gas routing and conditioning interfaces",
    "tasks": [
     {
      "id": "X01",
      "component": "Draft / static pressure at gas- path branches",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Main gas path upstream/downstream interface. Compare with fan and damper operation; isolate and purge impulse lines, zero/span as installed."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. ESP/bag arrangement not confirmed",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X02",
      "component": "Inlet / outlet gas temperature transmitters",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Main gas path upstream/downstream interface. Check plausible profile; inspect thermowells at isolated outage; TC/RTD loop verify."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Actual tap positions per P&ID",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X03",
      "component": "Inlet/outlet temperature and humidification control",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Gas conditioning tower, if installed. Trend process response; test TC/RTD loops and valve feedback; assess condensate exposure."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Conditional GCT",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X04",
      "component": "Spray-water flow / supply pressure",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Gas conditioning tower, if installed. Verify valve response, nozzle-line pressure and meter scaling with known reference."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Conditional GCT",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X05",
      "component": "Tank level and pump VFD electrical feedback",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Gas conditioning tower, if installed. Check level trends and pump drive channels; inspect cabling/alarms."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Conditional GCT",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "10.2",
    "title": "Electrostatic precipitator measurement interfaces",
    "tasks": [
     {
      "id": "X06",
      "component": "Secondary voltage (kV) feedback",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Transformer rectifier field by field. Trend by field; verify controller meter scaling only with qualified HV personnel."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Conditional ESP, HV permit",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X07",
      "component": "Secondary current (mA) feedback",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Transformer rectifier field by field. Compare field current with corona operating state; qualified HV reference tests."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Conditional ESP, HV permit",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X08",
      "component": "Primary voltage/current metering",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Transformer rectifier field by field. Check primary electrical channel mapping and transformer rectifier diagnostic consistency."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Conditional ESP, HV permit",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X09",
      "component": "Spark rate / TR trip / field-on alarms",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "ESP high-voltage controller. Review event trend and field state; function-test alarm in isolated OEM- approved mode."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Conditional ESP, HV permit",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X10",
      "component": "Rapper motor current, pulses and feedback",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "ESP rapper group / MCC. Confirm required rapping cycles and no missing groups; isolate for electrical feedback test."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Conditional ESP",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X11",
      "component": "Hopper high-level switch / level alarm",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "ESP field hopper. Compare dust removal operation to level alarm; verify switch with approved safe method."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Conditional ESP",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X12",
      "component": "Hopper heater temperature / element status",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "ESP hopper heating. Check heating response and overheat/failure diagnostics; prove thermal cutout safely."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Conditional ESP",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X13",
      "component": "Rotary valve or screw motor current / running status",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "ESP dust extraction / discharge. Compare hopper discharge to drive operation; check zero-speed target where fitted."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Conditional ESP",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X14",
      "component": "Outlet opacity or particulate monitoring",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "ESP / stack emissions interface. Review zero/span and optical or PM sensor diagnostics; maintain to permits and QA plan."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. If present / required by permits",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "10.3",
    "title": "Main kiln/preheater fabric filter instrument interfaces",
    "tasks": [
     {
      "id": "X15",
      "component": "Filter differential pressure (dirty to clean)",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Main kiln/preheater bag filter. Inspect H/L tubes and pressure taps; correlate DP with airflow and pulse sequence; zero/span."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Conditional main baghouse",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X16",
      "component": "Compartment pressure / damper position",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Main kiln/preheater bag filter. Check actuator feedback, exhaust path and DP signal response; test safely in isolation."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. If compartmented",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X17",
      "component": "Inlet / outlet gas temperature",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Main kiln/preheater bag filter. Check dew-point/overtemperature exposure and instrument drift; verify thermowells."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Conditional main baghouse",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X18",
      "component": "Bag-leak monitor / particulate broken-bag indication",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Main bag filter outlet or sections. Inspect triboelectric/PM monitor electronics and probe condition; perform prescribed QA check."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. If installed / permit",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X19",
      "component": "Pulse header compressed-air pressure",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Pulse cleaning air supply. Check filter regulator, water trap and pressure transmitter; zero/span to calibrated reference."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. If pulse-jet cleaning",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X20",
      "component": "Air dryer dew point / moisture alarm",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Pulse cleaning air supply. Verify dryer regeneration and alarm operation; compare with certified dew-point instrument."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. If equipped",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X21",
      "component": "Pulse cycle, valve-feedback or current monitoring",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Pulse-jet diaphragm / solenoid valves. Observe cleaning cycle, check solenoid feedback and stuck valve signatures in safe OEM test."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. If pulse-jet cleaning",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X22",
      "component": "Hopper level or bridging alarm",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Baghouse hopper / dust valve. Confirm alarm and discharge; proof-test nonintrusively or during isolated maintenance."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. If installed",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X23",
      "component": "Rotary airlock / screw feeder speed and current",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Baghouse dust handling. Trend running load and actual discharge speed; test independent zero-speed pickup."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. If motorized dust extraction",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X24",
      "component": "Fan vibration, bearing temperature, drive current and speed",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Baghouse exhaust fan. Verify installed bearing probes and VFD feedback; baseline at matched fan speed."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. If main exhaust fan allocated",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X25",
      "component": "CEMS / opacity / PM measurement",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Baghouse stack or clean duct. Verify audit and span checks, clean sample/optics, record permit-defined validity/QA."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Only if required/fitted",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     }
    ]
   },
   {
    "num": "10.4",
    "title": "Shared utilities and protection instrument interfaces",
    "tasks": [
     {
      "id": "X26",
      "component": "Instrument air header pressure / DP / dew point",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Shared instrument air and purge systems. Check dry clean air to analyzer blowback, bag pulse and purged pressure taps; verify alarms."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Actual shared headers TBC",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X27",
      "component": "Fan VFD motor feedback and damper position",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Exhaust fans and gas-routing dampers. Validate tag identity and actuator actual-v-command positions; inspect local interfaces."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Auxiliary fans may be unlisted",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X28",
      "component": "Explosion relief, door limit or access interlocks",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "Safety interlocks and access monitoring. Prove only under authorized safety test plan; never bypass live protection."
       }
      ],
      "pass": "Verify instrument actually installed, OEM approved test method, calibration history and safe access. Depends on HAZOP/OEM",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     },
     {
      "id": "X29",
      "component": "ESP-inlet CO analyser and CO-trip signal",
      "priority": "Conditional",
      "check": [
       {
        "label": "Area",
        "text": "ESP inlet gas, if ESP installed. Verify analyser availability, response time and calibration; prove the CO-trip signal end-to-end to the ESP HV controller with the DCS / SIS owner."
       }
      ],
      "pass": "CO trip reaches the HV controller within the approved time; analyser calibrated; no bypass. Conditional ESP.",
      "freq": "SITE / OEM",
      "owner": "IN",
      "mode": "OFF / RUN",
      "scope": "VERIFY"
     }
    ]
   }
  ],
  "conditional": true
 }
];
